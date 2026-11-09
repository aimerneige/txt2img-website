import type { Dict, LocaleMeta, LocaleModule, MessageKey } from './types'

// Every file in ./locales is picked up automatically. To add a language, drop in a new
// file that default-exports a LocaleModule (see zh-CN.ts for the full key set).
const modules = import.meta.glob<{ default: LocaleModule }>('./locales/*.ts', { eager: true })

const registry = new Map<string, LocaleModule>()
for (const mod of Object.values(modules)) registry.set(mod.default.meta.code, mod.default)

export const LOCALES: LocaleMeta[] = [...registry.values()].map((m) => m.meta).sort((a, b) => a.order - b.order)

const FALLBACK = 'en'
const STORAGE_KEY = 'txt2img:locale'
let current: LocaleModule = registry.get(FALLBACK) ?? [...registry.values()][0]
const listeners = new Set<() => void>()

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

function format(str: string, params?: Record<string, string | number>) {
  if (!params) return str
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return tk(key, params)
}

/** Untyped variant for keys built at runtime (e.g. `fonts.${id}`). */
export function tk(key: string, params?: Record<string, string | number>): string {
  const str = lookup(current.messages, key) ?? lookup(registry.get(FALLBACK)?.messages ?? {}, key) ?? key
  return format(str, params)
}

export const getLocale = () => current.meta

export function detectLocale(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && registry.has(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const pref of prefs) {
    const lower = (pref || '').toLowerCase()
    const exact = LOCALES.find((l) => l.code.toLowerCase() === lower)
    if (exact) return exact.code
    const loose = LOCALES.find((l) => l.match.some((m) => lower === m || lower.startsWith(m + '-')))
    if (loose) return loose.code
  }
  return FALLBACK
}

export function setLocale(code: string, persist = true) {
  const next = registry.get(code)
  if (!next) return
  current = next
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }
  const html = document.documentElement
  html.lang = next.meta.code
  html.dir = next.meta.dir ?? 'ltr'
  document.title = t('app.docTitle')
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'))
  translateDom(document)
  listeners.forEach((fn) => fn())
}

export function onLocaleChange(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Static markup is translated through attributes:
 *   data-i18n="key"                       -> textContent
 *   data-i18n-attr="placeholder:key;aria-label:key" -> attributes
 */
export function translateDom(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = tk(el.dataset.i18n!)
  })
  root.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim())
      if (attr && key) el.setAttribute(attr, tk(key))
    }
  })
}

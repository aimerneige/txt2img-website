import './styles/main.css'
import { ensureFontsFor, FONTS, getFont, loadFontFaces, type FontDef } from './core/fonts'
import { clearMeasureCache, computeLayout, type Layout } from './core/layout'
import { exportPng, exportSize, renderPreview } from './core/render'
import {
  DEFAULT_SETTINGS,
  EXPORT_WIDTHS,
  PALETTES,
  RANGES,
  sanitizeSettings,
  type Align,
  type Settings,
} from './core/settings'
import { countChars } from './core/text'
import { detectLocale, getLocale, LOCALES, onLocaleChange, setLocale, t, tk } from './i18n'
import type { MessageKey } from './i18n/types'
import { createSegmented, createSlider, createSwitch } from './ui/controls'
import { icons, type IconName } from './ui/icons'
import { createModal } from './ui/modal'
import { installRipple } from './ui/ripple'
import { createSelect } from './ui/select'
import { currentTheme, initTheme, toggleTheme } from './ui/theme'
import { toast } from './ui/toast'

// ---------------------------------------------------------------------------
// helpers

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* quota or privacy mode */
    }
  },
}

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let timer = 0
  return (...a: A) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn(...a), ms)
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html !== undefined) e.innerHTML = html
  return e
}

function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((node) => {
    node.innerHTML = icons[node.dataset.icon as IconName] ?? ''
    node.classList.add('icon-slot')
  })
}

// ---------------------------------------------------------------------------
// state

const KEYS = { settings: 'txt2img:settings', text: 'txt2img:text' }
const firstVisit = storage.get(KEYS.settings) === null

let settings: Settings = (() => {
  try {
    return sanitizeSettings(JSON.parse(storage.get(KEYS.settings) ?? 'null'))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
})()

const textArea = $<HTMLTextAreaElement>('#text')
const titleInput = $<HTMLInputElement>('#title-input')
const saveSettings = debounce(() => storage.set(KEYS.settings, JSON.stringify(settings)), 300)
const saveText = debounce(() => storage.set(KEYS.text, textArea.value), 400)

/** Style defaults for the current language (font and alignment that suit its script). */
function localeDefaults(): Partial<Settings> {
  const d = getLocale().defaults ?? {}
  const out: Partial<Settings> = {}
  if (d.fontId && FONTS.some((f) => f.id === d.fontId)) out.fontId = d.fontId
  if (d.align) out.align = d.align
  return out
}

const localeRefreshers: (() => void)[] = []
let settingsRefreshers: (() => void)[] = []

function update(patch: Partial<Settings>, delay = 40) {
  settings = { ...settings, ...patch }
  saveSettings()
  scheduleRender(delay)
}

// ---------------------------------------------------------------------------
// rendering

const previewHost = $('#preview-host')
const previewEmpty = $('#preview-empty')
const previewLoading = $('#preview-loading')
const previewSize = $('#preview-size')
let layout: Layout | null = null
let renderToken = 0
let renderTimer = 0

const dateText = () => new Intl.DateTimeFormat(getLocale().code, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

function allVisibleText() {
  return [settings.title, textArea.value, settings.footer, dateText(), '•0123456789.'].join('\n')
}

async function prepareLayout(): Promise<Layout> {
  const font = getFont(settings.fontId)
  await ensureFontsFor(font, allVisibleText())
  return computeLayout(textArea.value, settings, { dateText: dateText() })
}

function scheduleRender(delay = 40) {
  clearTimeout(renderTimer)
  renderTimer = window.setTimeout(render, delay)
}

async function render() {
  const token = ++renderToken
  const loadingTimer = window.setTimeout(() => previewLoading.classList.add('show'), 160)
  let next: Layout
  try {
    next = await prepareLayout()
  } finally {
    clearTimeout(loadingTimer)
    if (token === renderToken) previewLoading.classList.remove('show')
  }
  if (token !== renderToken) return
  layout = next
  const empty = next.isEmpty && !settings.title.trim()
  previewEmpty.classList.toggle('show', empty)
  previewHost.classList.toggle('dim', empty)
  paintPreview()
}

function paintPreview() {
  if (!layout) return
  const width = previewHost.clientWidth
  if (width > 0) renderPreview(previewHost, layout, width)
  const { width: w, height: h } = exportSize(layout, settings.exportWidth)
  previewSize.textContent = t('preview.size', { w, h: h.toLocaleString(getLocale().code) })
}

new ResizeObserver(debounce(paintPreview, 60)).observe(previewHost)
document.fonts?.addEventListener?.('loadingdone', () => {
  clearMeasureCache()
  scheduleRender(30)
})

// ---------------------------------------------------------------------------
// header: language, theme, github

function buildHeader() {
  $('#brand-mark').innerHTML = icons.logo
  $('#github-link').innerHTML = icons.github
  $('#icon-sun').innerHTML = icons.sun
  $('#icon-moon').innerHTML = icons.moon

  const lang = createSelect({
    className: 'select-compact',
    align: 'end',
    leadingIcon: `<span class="select-lead">${icons.globe}</span>`,
    label: () => t('header.language'),
    value: getLocale().code,
    options: LOCALES.map((l) => ({
      value: l.code,
      render: (node, where) => {
        node.textContent = l.name
        node.lang = l.code
        if (where === 'trigger') node.classList.add('lang-name')
      },
    })),
    onChange: (code) => {
      const wasSample = isSampleText()
      setLocale(code)
      if (wasSample) loadSample(false)
    },
  })
  $('#lang-slot').appendChild(lang.el)
  localeRefreshers.push(lang.refresh)

  const themeBtn = $<HTMLButtonElement>('#theme-btn')
  const syncThemeLabel = () => {
    const label = currentTheme() === 'dark' ? t('header.themeToLight') : t('header.themeToDark')
    themeBtn.setAttribute('aria-label', label)
    themeBtn.dataset.tip = label
  }
  themeBtn.addEventListener('click', (e) => {
    const r = themeBtn.getBoundingClientRect()
    const origin = e.detail === 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: e.clientX, y: e.clientY }
    toggleTheme(origin, syncThemeLabel)
  })
  initTheme(syncThemeLabel)
  localeRefreshers.push(syncThemeLabel)
}

// ---------------------------------------------------------------------------
// settings panel

function fontOptionRender(font: FontDef) {
  return (node: HTMLElement, where: 'option' | 'trigger') => {
    const name = el('span', 'font-name')
    name.textContent = tk(`fonts.${font.id}`)
    name.style.fontFamily = `"${font.family}", ${font.fallback.map((f) => `"${f}"`).join(', ')}, sans-serif`
    node.appendChild(name)
    if (where === 'option') {
      const meta = el('span', 'font-meta')
      meta.textContent = `${tk(`fontCategory.${font.category}`)} · ${tk(`fontScript.${font.script}`)}`
      node.appendChild(meta)
    }
  }
}

function section(title: MessageKey, icon: IconName) {
  const wrap = el('section', 'settings-section')
  const head = el('h3', 'section-title', `<span class="icon-slot">${icons[icon]}</span><span></span>`)
  const label = head.querySelector('span:last-child')!
  settingsRefreshers.push(() => (label.textContent = t(title)))
  const body = el('div', 'section-body')
  wrap.append(head, body)
  return { wrap, body }
}

type NumKey = keyof typeof RANGES

function slider(key: NumKey, label: MessageKey, format: (v: number) => string) {
  const r = RANGES[key]
  const s = createSlider({
    label: () => t(label),
    min: r.min,
    max: r.max,
    step: r.step,
    value: settings[key],
    defaultValue: DEFAULT_SETTINGS[key],
    format,
    onInput: (v) => update({ [key]: v } as Partial<Settings>, 30),
  })
  settingsRefreshers.push(s.refresh)
  return s.el
}

function toggle(key: 'indent' | 'showDate' | 'pangu' | 'collapseBlank' | 'markdown', label: MessageKey, hint?: MessageKey) {
  const s = createSwitch({
    label: () => t(label),
    hint: hint ? () => t(hint) : undefined,
    value: settings[key],
    onChange: (v) => update({ [key]: v } as Partial<Settings>),
  })
  settingsRefreshers.push(s.refresh)
  return s.el
}

function textField(key: 'footer', label: MessageKey, placeholder: MessageKey) {
  const wrap = el('label', 'field-wrap')
  const cap = el('span', 'field-label')
  const input = el('input', 'field') as HTMLInputElement
  input.type = 'text'
  input.maxLength = 80
  input.autocomplete = 'off'
  input.value = settings[key]
  input.addEventListener('input', () => update({ [key]: input.value }, 150))
  wrap.append(cap, input)
  settingsRefreshers.push(() => {
    cap.textContent = t(label)
    input.placeholder = t(placeholder)
  })
  return wrap
}

let fontSelect: ReturnType<typeof createSelect<string>> | null = null

function buildSettings() {
  const slot = $('#settings-slot')
  slot.replaceChildren()
  fontSelect?.destroy()
  settingsRefreshers = []

  // font
  const fontSec = section('settings.sectionFont', 'type')
  fontSelect = createSelect({
    className: 'select-font',
    label: () => t('settings.font'),
    value: settings.fontId,
    options: FONTS.map((f) => ({ value: f.id, render: fontOptionRender(f) })),
    onChange: (id) => update({ fontId: id }, 0),
  })
  settingsRefreshers.push(fontSelect.refresh)
  fontSec.body.appendChild(fontSelect.el)

  // layout
  const layoutSec = section('settings.sectionLayout', 'sliders')
  const grid = el('div', 'slider-grid')
  grid.append(
    slider('fontSize', 'settings.fontSize', (v) => `${v}px`),
    slider('lineHeight', 'settings.lineHeight', (v) => `${v.toFixed(2)}×`),
    slider('letterSpacing', 'settings.letterSpacing', (v) => `${v.toFixed(1)}px`),
    slider('paragraphSpacing', 'settings.paragraphSpacing', (v) => `${v}px`),
    slider('padding', 'settings.padding', (v) => `${v}px`),
  )
  const alignWrap = el('div', 'field-wrap')
  const alignCap = el('span', 'field-label')
  const align = createSegmented<Align>({
    label: () => t('settings.align'),
    value: settings.align,
    options: [
      { value: 'left', label: () => t('settings.alignLeft'), icon: icons.alignLeft },
      { value: 'justify', label: () => t('settings.alignJustify'), icon: icons.alignJustify },
      { value: 'center', label: () => t('settings.alignCenter'), icon: icons.alignCenter },
    ],
    onChange: (v) => update({ align: v }, 0),
  })
  alignWrap.append(alignCap, align.el)
  settingsRefreshers.push(align.refresh, () => (alignCap.textContent = t('settings.align')))
  grid.appendChild(alignWrap)
  layoutSec.body.append(grid, toggle('indent', 'settings.indent', 'settings.indentHint'))

  // look
  const lookSec = section('settings.sectionLook', 'palette')
  const palWrap = el('div', 'field-wrap')
  const palCap = el('span', 'field-label')
  const swatches = el('div', 'swatches')
  swatches.setAttribute('role', 'radiogroup')
  const swatchBtns = PALETTES.map((p, i) => {
    const b = el('button', 'swatch') as HTMLButtonElement
    b.type = 'button'
    b.setAttribute('role', 'radio')
    b.style.setProperty('--sw-bg', p.bg)
    b.style.setProperty('--sw-fg', p.text)
    b.style.setProperty('--sw-accent', p.accent)
    b.innerHTML = `<span class="swatch-chip"><span class="swatch-aa">Aa</span><span class="swatch-dot"></span></span><span class="swatch-name"></span><span class="swatch-check">${icons.check}</span>`
    b.addEventListener('click', () => pick(p.id))
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!d) return
      e.preventDefault()
      const n = PALETTES[(i + d + PALETTES.length) % PALETTES.length]
      pick(n.id)
      swatchBtns[PALETTES.indexOf(n)].focus()
    })
    swatches.appendChild(b)
    return b
  })
  const paintSwatches = () =>
    swatchBtns.forEach((b, i) => {
      const on = PALETTES[i].id === settings.paletteId
      b.setAttribute('aria-checked', String(on))
      b.tabIndex = on ? 0 : -1
    })
  const pick = (id: string) => {
    if (id === settings.paletteId) return
    update({ paletteId: id }, 0)
    paintSwatches()
  }
  paintSwatches()
  settingsRefreshers.push(() => {
    palCap.textContent = t('settings.palette')
    swatches.setAttribute('aria-label', t('settings.palette'))
    swatchBtns.forEach((b, i) => {
      const name = tk(`palettes.${PALETTES[i].id}`)
      b.querySelector('.swatch-name')!.textContent = name
      b.setAttribute('aria-label', name)
    })
  })
  palWrap.append(palCap, swatches)
  lookSec.body.append(palWrap, textField('footer', 'settings.footer', 'settings.footerPlaceholder'), toggle('showDate', 'settings.showDate', 'settings.showDateHint'))

  // processing
  const procSec = section('settings.sectionProcess', 'wand')
  procSec.body.append(
    toggle('markdown', 'settings.markdown', 'settings.markdownHint'),
    toggle('pangu', 'settings.pangu', 'settings.panguHint'),
    toggle('collapseBlank', 'settings.collapseBlank', 'settings.collapseBlankHint'),
  )

  slot.append(fontSec.wrap, layoutSec.wrap, lookSec.wrap, procSec.wrap)
  settingsRefreshers.forEach((fn) => fn())
}

// ---------------------------------------------------------------------------
// editor

const charCount = $('#char-count')
function syncCount() {
  charCount.textContent = t('editor.chars', { n: countChars(textArea.value).toLocaleString(getLocale().code) })
}

function setText(value: string) {
  textArea.value = value
  syncCount()
  saveText()
  scheduleRender(0)
}

function isSampleText() {
  return textArea.value.trim() === t('sample.body').trim() && settings.title === t('sample.title')
}

function loadSample(withUndo = true) {
  const prev = { text: textArea.value, title: settings.title }
  titleInput.value = t('sample.title')
  update({ title: titleInput.value }, 0)
  setText(t('sample.body'))
  if (withUndo && prev.text.trim() && prev.text !== textArea.value) {
    toast(t('editor.sample'), {
      action: {
        label: t('toast.undo'),
        run: () => {
          titleInput.value = prev.title
          update({ title: prev.title }, 0)
          setText(prev.text)
        },
      },
    })
  }
}

function insertText(str: string) {
  textArea.focus()
  const { selectionStart: s, selectionEnd: e } = textArea
  textArea.setRangeText(str, s, e, 'end')
  setText(textArea.value)
}

async function importFile(file: File) {
  const okType = file.type.startsWith('text/') || /\.(txt|md|markdown|text)$/i.test(file.name) || (!file.type && file.size < 5e6)
  if (!okType) return toast(t('toast.importFailed'), { kind: 'error' })
  try {
    const text = await file.text()
    if (text.includes('\u0000')) throw new Error('binary')
    setText(text)
    toast(t('toast.imported', { name: file.name }), { kind: 'success' })
  } catch {
    toast(t('toast.importFailed'), { kind: 'error' })
  }
}

function buildEditor() {
  textArea.value = storage.get(KEYS.text) ?? ''
  titleInput.value = settings.title
  if (storage.get(KEYS.text) === null && !settings.title) {
    titleInput.value = t('sample.title')
    settings.title = titleInput.value
    textArea.value = t('sample.body')
  }
  syncCount()

  textArea.addEventListener('input', () => {
    syncCount()
    saveText()
    scheduleRender(textArea.value.length > 20000 ? 350 : 160)
  })
  titleInput.addEventListener('input', () => update({ title: titleInput.value }, 120))

  $('#btn-sample').addEventListener('click', () => loadSample())
  $('#btn-paste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return toast(t('toast.pasteEmpty'))
      insertText(text)
    } catch {
      toast(t('toast.pasteFailed'), { kind: 'error' })
      textArea.focus()
    }
  })
  const fileInput = $<HTMLInputElement>('#file-input')
  $('#btn-import').addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0]
    if (f) importFile(f)
    fileInput.value = ''
  })
  $('#btn-clear').addEventListener('click', () => {
    const prev = textArea.value
    if (!prev) return
    setText('')
    textArea.focus()
    toast(t('toast.cleared'), { action: { label: t('toast.undo'), run: () => setText(prev) } })
  })

  const zone = $('#drop-zone')
  let depth = 0
  zone.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    depth++
    zone.classList.add('dragging')
  })
  zone.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
  })
  zone.addEventListener('dragleave', () => {
    if (--depth <= 0) {
      depth = 0
      zone.classList.remove('dragging')
    }
  })
  zone.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0]
    depth = 0
    zone.classList.remove('dragging')
    if (!f) return
    e.preventDefault()
    importFile(f)
  })

  localeRefreshers.push(syncCount)
}

// ---------------------------------------------------------------------------
// export: download / copy / share

const downloadBtns = [$<HTMLButtonElement>('#btn-download'), $<HTMLButtonElement>('#btn-download-m')]
let exporting = false
let cache: { key: string; blob: Blob } | null = null

const exportKey = () => JSON.stringify([settings, textArea.value, dateText()])

function setBusy(busy: boolean, progress = 0) {
  for (const b of downloadBtns) {
    b.classList.toggle('busy', busy)
    b.setAttribute('aria-busy', String(busy))
    b.style.setProperty('--progress', String(progress))
    b.querySelector('.btn-label')!.textContent = busy ? t('preview.exporting') : t('preview.download')
  }
}

async function makeBlob(): Promise<Blob | null> {
  if (!textArea.value.trim() && !settings.title.trim()) {
    toast(t('toast.emptyText'))
    textArea.focus()
    return null
  }
  const key = exportKey()
  if (cache?.key === key) return cache.blob
  if (exporting) return null
  exporting = true
  setBusy(true, 0.05)
  try {
    const lay = await prepareLayout()
    const blob = await exportPng(lay, settings.exportWidth, (p) => setBusy(true, Math.max(0.05, p)))
    cache = { key, blob }
    return blob
  } catch (err) {
    console.error(err)
    toast(t((err as Error)?.message === 'too-tall' ? 'toast.tooTall' : 'toast.exportFailed'), { kind: 'error' })
    return null
  } finally {
    exporting = false
    setBusy(false)
  }
}

function fileName() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  const title = settings.title.trim().replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40)
  return `${title || 'txt2img'}-${stamp}.png`
}

async function download() {
  const blob = await makeBlob()
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
  toast(t('toast.downloaded'), { kind: 'success' })
}

function copy() {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    toast(t('toast.copyUnsupported'), { kind: 'error' })
    return
  }
  // The ClipboardItem must be created synchronously inside the click (Safari).
  const blobPromise = makeBlob().then((b) => {
    if (!b) throw new Error('empty')
    return b
  })
  navigator.clipboard
    .write([new ClipboardItem({ 'image/png': blobPromise })])
    .then(() => toast(t('toast.copied'), { kind: 'success' }))
    .catch(async () => {
      if (await blobPromise.catch(() => null)) toast(t('toast.copyUnsupported'), { kind: 'error' })
    })
}

async function share() {
  const blob = await makeBlob()
  if (!blob) return
  const file = new File([blob], fileName(), { type: 'image/png' })
  try {
    await navigator.share({ files: [file], title: settings.title || t('app.title') })
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') toast(t('toast.shareFailed'), { kind: 'error' })
  }
}

function buildActions() {
  downloadBtns.forEach((b) => b.addEventListener('click', download))
  $('#btn-copy').addEventListener('click', copy)
  const shareBtn = $<HTMLButtonElement>('#btn-share')
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }))
  } catch {
    shareBtn.hidden = true
  }
  shareBtn.addEventListener('click', share)

  const width = createSegmented<number>({
    label: () => t('preview.width'),
    value: settings.exportWidth,
    options: EXPORT_WIDTHS.map((w) => ({ value: w, label: () => String(w) })),
    onChange: (v) => {
      update({ exportWidth: v }, 0)
    },
  })
  $('#width-slot').appendChild(width.el)
  localeRefreshers.push(width.refresh)

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault()
      download()
    }
  })
}

// ---------------------------------------------------------------------------
// mobile preview sheet

function buildSheet() {
  const panel = $('#preview-panel')
  const openSheet = () => {
    panel.classList.add('sheet-open')
    document.documentElement.classList.add('no-scroll')
    $('#sheet-close').focus({ preventScroll: true })
  }
  const closeSheet = () => {
    if (!panel.classList.contains('sheet-open')) return
    panel.classList.remove('sheet-open')
    document.documentElement.classList.remove('no-scroll')
    $('#btn-open-preview').focus({ preventScroll: true })
  }
  $('#btn-open-preview').addEventListener('click', openSheet)
  $('#sheet-close').addEventListener('click', closeSheet)
  $('#sheet-backdrop').addEventListener('click', closeSheet)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('sheet-open') && !document.querySelector('.modal:not([hidden]), .select.open')) closeSheet()
  })
  window.matchMedia('(min-width: 961px)').addEventListener('change', (m) => m.matches && closeSheet())
  localeRefreshers.push(() => $('#sheet-close').setAttribute('data-tip', t('preview.close')))
}

// ---------------------------------------------------------------------------
// licenses dialog

function buildLicenses() {
  const modal = createModal({ className: 'licenses-modal', closeLabel: () => t('licenses.close') })
  const fill = () => {
    modal.setTitle(t('licenses.title'))
    const intro = el('p', 'licenses-intro')
    intro.textContent = t('licenses.intro')
    const list = el('ul', 'licenses-list')
    for (const f of FONTS) {
      const li = el('li', 'license-item')
      const name = el('span', 'license-name')
      name.textContent = tk(`fonts.${f.id}`)
      name.style.fontFamily = `"${f.family}", ${f.fallback.map((x) => `"${x}"`).join(', ')}`
      const meta = el('span', 'license-meta')
      meta.textContent = `${f.family} · ${f.author} · SIL OFL 1.1`
      const links = el('span', 'license-links')
      const src = el('a', 'link-btn') as HTMLAnchorElement
      src.href = f.source
      src.target = '_blank'
      src.rel = 'noopener noreferrer'
      src.innerHTML = `<span></span>${icons.external}`
      src.querySelector('span')!.textContent = t('licenses.source')
      const lic = el('a', 'link-btn') as HTMLAnchorElement
      lic.href = `./licenses/${f.id}.txt`
      lic.target = '_blank'
      lic.rel = 'noopener'
      lic.innerHTML = `<span></span>${icons.external}`
      lic.querySelector('span')!.textContent = t('licenses.viewLicense')
      links.append(src, lic)
      li.append(name, meta, links)
      list.appendChild(li)
    }
    modal.body.replaceChildren(intro, list)
  }
  $('#btn-licenses').addEventListener('click', () => {
    fill()
    modal.open()
  })
}

// ---------------------------------------------------------------------------
// boot

const topbar = $('#topbar')
const syncTopbar = () => topbar.classList.toggle('scrolled', window.scrollY > 4)
window.addEventListener('scroll', syncTopbar, { passive: true })
syncTopbar()

setLocale(detectLocale(), false)
if (firstVisit) settings = { ...settings, ...localeDefaults() }
loadFontFaces()
fillIcons()
installRipple()
buildHeader()
buildEditor()
buildSettings()
buildActions()
buildSheet()
buildLicenses()

$('#btn-reset').addEventListener('click', () => {
  // Reset style only: keep content and the export width (it lives in the preview panel).
  settings = { ...DEFAULT_SETTINGS, ...localeDefaults(), title: settings.title, footer: settings.footer, exportWidth: settings.exportWidth }
  saveSettings()
  buildSettings()
  scheduleRender(0)
  toast(t('settings.resetDone'), { kind: 'success' })
})

onLocaleChange(() => {
  localeRefreshers.forEach((fn) => fn())
  settingsRefreshers.forEach((fn) => fn())
  scheduleRender(0)
})
localeRefreshers.forEach((fn) => fn())
render()

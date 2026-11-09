// User-added fonts: fonts installed on this device (referenced by family name) and font files
// uploaded from disk. Nothing leaves the browser: system font names live in localStorage,
// uploaded files in IndexedDB.
import { customFonts, type FontDef, type FontKind } from './fonts'

const SYSTEM_KEY = 'txt2img:system-fonts'
const DB_NAME = 'txt2img'
const STORE = 'fonts'

export const MAX_FONT_BYTES = 50 * 1024 * 1024
export const FONT_FILE_RE = /\.(ttf|otf|woff2?)$/i
export const FONT_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2'

interface StoredUpload {
  id: string
  name: string
  data: ArrayBuffer
  added: number
}

const faces = new Map<string, FontFace>()

function makeDef(kind: FontKind, id: string, family: string, label: string): FontDef {
  return {
    id,
    family,
    label,
    kind,
    category: 'sans',
    regular: 400,
    bold: 700,
    fallback: ['Noto Sans SC', 'Noto Sans JP'],
    script: 'latin',
    author: '',
    source: '',
  }
}

/** Strip characters that would break a CSS font-family string. */
export const cleanFamily = (name: string) => name.replace(/["\\;{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100)

// ---- system fonts ---------------------------------------------------------

const systemId = (family: string) => `system:${family.toLowerCase()}`

function readSystemList(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SYSTEM_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').map(cleanFamily).filter(Boolean) : []
  } catch {
    return []
  }
}

function writeSystemList() {
  try {
    const list = customFonts.filter((f) => f.kind === 'system').map((f) => f.family)
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

/**
 * Whether a font family is installed. A missing family falls back to the generic one, so text
 * measured with it matches the generic width for every base.
 */
export function isFontAvailable(family: string): boolean {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return true
  const sample = 'mmmmmmmmmmwwwwwlliI10@永和九年春あいうえお'
  for (const base of ['monospace', 'serif', 'sans-serif']) {
    ctx.font = `72px ${base}`
    const w0 = ctx.measureText(sample).width
    ctx.font = `72px "${family}", ${base}`
    if (ctx.measureText(sample).width !== w0) return true
  }
  return false
}

/** Local Font Access API (Chromium desktop). */
export const canListSystemFonts = () => typeof (window as { queryLocalFonts?: unknown }).queryLocalFonts === 'function'

export async function listSystemFonts(): Promise<string[]> {
  const query = (window as unknown as { queryLocalFonts: () => Promise<{ family: string }[]> }).queryLocalFonts
  const fonts = await query()
  return [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b))
}

export type AddResult = { font: FontDef; existed: boolean; persisted: boolean }

export function addSystemFont(name: string): AddResult {
  const family = cleanFamily(name)
  const id = systemId(family)
  const existing = customFonts.find((f) => f.id === id)
  if (existing) return { font: existing, existed: true, persisted: true }
  const font = makeDef('system', id, family, family)
  customFonts.push(font)
  writeSystemList()
  return { font, existed: false, persisted: true }
}

// ---- uploaded fonts -------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function registerUpload(rec: StoredUpload): Promise<FontDef> {
  // A private family name so an upload never collides with an installed or embedded font.
  const family = `txt2img-upload-${rec.id}`
  // Weight 400 only: the browser synthesizes bold from it when the layout asks for 700.
  const face = new FontFace(family, rec.data, { weight: '400', style: 'normal', display: 'swap' })
  await face.load()
  document.fonts.add(face)
  faces.set(rec.id, face)
  return makeDef('upload', `upload:${rec.id}`, family, rec.name)
}

const newId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '')

export class FontFileError extends Error {}

/** Load a font file, keep it for later visits and add it to the font list. */
export async function addUploadedFont(file: File, lang: string): Promise<AddResult> {
  if (!FONT_FILE_RE.test(file.name) && !/^font\//.test(file.type)) throw new FontFileError('type')
  if (file.size > MAX_FONT_BYTES) throw new FontFileError('size')
  const data = await file.arrayBuffer()
  const name = cleanFamily(readFontName(data, lang) ?? file.name.replace(/\.[^.]+$/, '')) || 'Font'
  const rec: StoredUpload = { id: newId(), name, data, added: Date.now() }
  let font: FontDef
  try {
    font = await registerUpload(rec)
  } catch {
    throw new FontFileError('invalid')
  }
  customFonts.push(font)
  let persisted = true
  try {
    await withStore('readwrite', (s) => s.put(rec))
  } catch {
    persisted = false // still usable for this visit
  }
  return { font, existed: false, persisted }
}

// ---- shared ---------------------------------------------------------------

export async function removeCustomFont(id: string) {
  const i = customFonts.findIndex((f) => f.id === id)
  if (i < 0) return
  const [font] = customFonts.splice(i, 1)
  if (font.kind === 'system') return writeSystemList()
  const key = id.slice('upload:'.length)
  const face = faces.get(key)
  if (face) document.fonts.delete(face)
  faces.delete(key)
  await withStore('readwrite', (s) => s.delete(key)).catch(() => undefined)
}

/** Restore fonts added on earlier visits. Fonts that fail to load are skipped. */
export async function initCustomFonts() {
  for (const family of readSystemList()) addSystemFont(family)
  let records: StoredUpload[] = []
  try {
    records = await withStore<StoredUpload[]>('readonly', (s) => s.getAll())
  } catch {
    return
  }
  records.sort((a, b) => a.added - b.added)
  const loaded = await Promise.all(records.map((r) => registerUpload(r).catch(() => null)))
  for (const f of loaded) if (f) customFonts.push(f)
}

/**
 * Read the family name from a TTF/OTF `name` table, preferring the UI language.
 * WOFF/WOFF2 are compressed, so they fall back to the file name.
 */
function readFontName(buf: ArrayBuffer, lang: string): string | null {
  try {
    const v = new DataView(buf)
    const tag = v.getUint32(0)
    if (tag !== 0x00010000 && tag !== 0x4f54544f && tag !== 0x74727565) return null
    const tables = v.getUint16(4)
    let off = -1
    for (let i = 0; i < tables; i++) {
      const r = 12 + i * 16
      if (v.getUint32(r) === 0x6e616d65) {
        off = v.getUint32(r + 8)
        break
      }
    }
    if (off < 0) return null
    const count = v.getUint16(off + 2)
    const strings = off + v.getUint16(off + 4)
    const prefer = lang.startsWith('zh') ? [0x804, 0x404, 0xc04, 0x1004] : lang.startsWith('ja') ? [0x411] : []
    let best: { score: number; name: string } | null = null
    for (let i = 0; i < count; i++) {
      const r = off + 6 + i * 12
      const platform = v.getUint16(r)
      const langId = v.getUint16(r + 4)
      const nameId = v.getUint16(r + 6)
      if (platform !== 3 || (nameId !== 1 && nameId !== 16)) continue
      const len = v.getUint16(r + 8)
      const start = strings + v.getUint16(r + 10)
      let s = ''
      for (let j = 0; j + 1 < len; j += 2) s += String.fromCharCode(v.getUint16(start + j))
      s = s.trim()
      if (!s) continue
      const score = (prefer.includes(langId) ? 4 : langId === 0x409 ? 2 : 0) + (nameId === 16 ? 1 : 0)
      if (!best || score > best.score) best = { score, name: s }
    }
    return best?.name ?? null
  } catch {
    return null
  }
}

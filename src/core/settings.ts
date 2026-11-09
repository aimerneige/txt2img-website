import { DEFAULT_FONT_ID } from './fonts'

export type Align = 'left' | 'justify' | 'center'

export interface Settings {
  fontId: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  padding: number
  align: Align
  indent: boolean
  paletteId: string
  exportWidth: number
  title: string
  showDate: boolean
  footer: string
  pangu: boolean
  collapseBlank: boolean
  markdown: boolean
}

/** Layout is done on a phone-sized logical canvas; export width only changes resolution. */
export const LOGICAL_WIDTH = 375

export const EXPORT_WIDTHS = [750, 1080, 1242, 1440] as const

export const DEFAULT_SETTINGS: Settings = {
  fontId: DEFAULT_FONT_ID,
  fontSize: 17,
  lineHeight: 1.8,
  letterSpacing: 0.4,
  paragraphSpacing: 14,
  padding: 28,
  align: 'justify',
  indent: false,
  paletteId: 'paper',
  exportWidth: 1080,
  title: '',
  showDate: true,
  footer: '',
  pangu: true,
  collapseBlank: true,
  markdown: true,
}

export const RANGES = {
  fontSize: { min: 12, max: 30, step: 1 },
  lineHeight: { min: 1.2, max: 2.6, step: 0.05 },
  letterSpacing: { min: -1, max: 6, step: 0.1 },
  paragraphSpacing: { min: 0, max: 48, step: 1 },
  padding: { min: 12, max: 56, step: 1 },
} as const

export interface Palette {
  id: string
  bg: string
  text: string
  muted: string
  accent: string
  rule: string
  quoteBg: string
}

export const PALETTES: Palette[] = [
  { id: 'paper', bg: '#ffffff', text: '#1f2328', muted: '#8a9099', accent: '#3d7bfd', rule: '#e6e8eb', quoteBg: '#f4f6f8' },
  { id: 'warm', bg: '#f6f0e3', text: '#3b342b', muted: '#998d7b', accent: '#c06a35', rule: '#e4d9c4', quoteBg: '#efe6d3' },
  { id: 'sage', bg: '#e4eedf', text: '#2c3a2a', muted: '#7b8c75', accent: '#3f8a4f', rule: '#cfdcc8', quoteBg: '#d9e6d2' },
  { id: 'mist', bg: '#eef1f7', text: '#25303d', muted: '#8590a0', accent: '#5b6be0', rule: '#dbe0ea', quoteBg: '#e3e8f2' },
  { id: 'night', bg: '#17191e', text: '#d7dbe2', muted: '#7d8591', accent: '#8ab4f8', rule: '#2b2f37', quoteBg: '#20232a' },
  { id: 'ink', bg: '#0f1c2e', text: '#e5e9f0', muted: '#8292a8', accent: '#f2b84b', rule: '#22324a', quoteBg: '#152539' },
]

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Merge stored (possibly stale or tampered) settings onto the defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS }
  if (!raw || typeof raw !== 'object') return s
  const r = raw as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const def = DEFAULT_SETTINGS[key]
    const v = r[key]
    if (typeof v === typeof def) (s as unknown as Record<string, unknown>)[key] = v
  }
  for (const [key, range] of Object.entries(RANGES) as [keyof typeof RANGES, { min: number; max: number }][]) {
    const n = Number(s[key])
    s[key] = clamp(Number.isFinite(n) ? n : DEFAULT_SETTINGS[key], range.min, range.max)
  }
  if (!['left', 'justify', 'center'].includes(s.align)) s.align = DEFAULT_SETTINGS.align
  if (!(EXPORT_WIDTHS as readonly number[]).includes(s.exportWidth)) s.exportWidth = DEFAULT_SETTINGS.exportWidth
  return s
}

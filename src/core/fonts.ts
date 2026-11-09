// Every font here is open source (SIL Open Font License 1.1) and bundled with the site.
// The CSS only declares @font-face rules split by unicode-range, so the browser
// downloads just the subsets the rendered text actually needs.
let faces: Promise<unknown> | null = null
/** Inject the @font-face stylesheet (once). */
export const loadFontFaces = () => (faces ??= import('./font-faces'))

export type FontCategory = 'sans' | 'serif' | 'kai' | 'hand' | 'display'

export interface FontDef {
  id: string
  family: string
  category: FontCategory
  regular: number
  bold: number
  /** Embedded fonts used for glyphs this font lacks (e.g. CJK for Latin-only fonts). */
  fallback: string[]
  /** Primary script the font is designed for, used as a hint in the picker. */
  script: 'zh' | 'ja' | 'latin'
  author: string
  source: string
}

export const FONTS: FontDef[] = [
  { id: 'noto-sans-sc', family: 'Noto Sans SC', category: 'sans', regular: 400, bold: 700, fallback: ['Noto Sans JP'], script: 'zh', author: 'Google', source: 'https://github.com/notofonts/noto-cjk' },
  { id: 'noto-serif-sc', family: 'Noto Serif SC', category: 'serif', regular: 400, bold: 700, fallback: ['Noto Serif JP'], script: 'zh', author: 'Google', source: 'https://github.com/notofonts/noto-cjk' },
  { id: 'lxgw-wenkai', family: 'LXGW WenKai', category: 'kai', regular: 400, bold: 700, fallback: ['Klee One', 'Noto Sans SC'], script: 'zh', author: 'LXGW', source: 'https://github.com/lxgw/LxgwWenKai' },
  { id: 'noto-sans-jp', family: 'Noto Sans JP', category: 'sans', regular: 400, bold: 700, fallback: ['Noto Sans SC'], script: 'ja', author: 'Google', source: 'https://github.com/notofonts/noto-cjk' },
  { id: 'noto-serif-jp', family: 'Noto Serif JP', category: 'serif', regular: 400, bold: 700, fallback: ['Noto Serif SC'], script: 'ja', author: 'Google', source: 'https://github.com/notofonts/noto-cjk' },
  { id: 'klee-one', family: 'Klee One', category: 'hand', regular: 400, bold: 600, fallback: ['LXGW WenKai', 'Noto Sans SC'], script: 'ja', author: 'Fontworks', source: 'https://github.com/fontworks-fonts/Klee' },
  { id: 'zen-maru-gothic', family: 'Zen Maru Gothic', category: 'sans', regular: 400, bold: 700, fallback: ['Noto Sans SC'], script: 'ja', author: 'Yoshimichi Ohira', source: 'https://github.com/googlefonts/zen-marugothic' },
  { id: 'ma-shan-zheng', family: 'Ma Shan Zheng', category: 'hand', regular: 400, bold: 400, fallback: ['LXGW WenKai', 'Noto Sans SC'], script: 'zh', author: 'Ma ShanZheng', source: 'https://github.com/googlefonts/mashanzheng' },
  { id: 'zcool-kuaile', family: 'ZCOOL KuaiLe', category: 'display', regular: 400, bold: 400, fallback: ['Noto Sans SC'], script: 'zh', author: 'ZCOOL', source: 'https://github.com/googlefonts/zcool-kuaile' },
  { id: 'inter', family: 'Inter', category: 'sans', regular: 400, bold: 700, fallback: ['Noto Sans SC', 'Noto Sans JP'], script: 'latin', author: 'Rasmus Andersson', source: 'https://github.com/rsms/inter' },
  { id: 'lora', family: 'Lora', category: 'serif', regular: 400, bold: 700, fallback: ['Noto Serif SC', 'Noto Serif JP'], script: 'latin', author: 'Cyreal', source: 'https://github.com/cyrealtype/Lora-Cyrillic' },
]

export const DEFAULT_FONT_ID = 'noto-sans-sc'

export function getFont(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0]
}

export function fontStack(font: FontDef): string {
  return [font.family, ...font.fallback].map((f) => `"${f}"`).join(', ') + ', sans-serif'
}

export function cssFont(font: FontDef, weight: number, size: number): string {
  return `${weight} ${size}px ${fontStack(font)}`
}

/**
 * Make sure the subsets needed for `text` are downloaded for the primary font and its fallbacks,
 * in both weights. Canvas can only draw with faces that have finished loading.
 */
export async function ensureFontsFor(font: FontDef, text: string): Promise<void> {
  await loadFontFaces()
  if (!('fonts' in document)) return
  const sample = text || 'A'
  const jobs: Promise<unknown>[] = []
  for (const family of [font.family, ...font.fallback]) {
    for (const w of new Set([font.regular, font.bold])) {
      jobs.push(document.fonts.load(`${w} 16px "${family}"`, sample).catch(() => undefined))
    }
  }
  await Promise.all(jobs)
}

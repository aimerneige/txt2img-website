import { cssFont, getFont } from './fonts'
import { getPalette, LOGICAL_WIDTH, type Palette, type Settings } from './settings'
import { parseText, type Block, type Span } from './text'

/** A drawable piece of text placed at x (logical px). `f` indexes Layout.fonts. */
export interface Glyph {
  t: string
  x: number
  f: number
}

export type Op =
  | { k: 'text'; top: number; bottom: number; baseline: number; color: string; glyphs: Glyph[] }
  | { k: 'rect'; top: number; bottom: number; x: number; w: number; color: string; r: number }

export interface Layout {
  width: number
  height: number
  fonts: string[]
  ops: Op[]
  palette: Palette
  isEmpty: boolean
}

interface Unit {
  text: string
  kind: 'word' | 'cjk' | 'space'
  f: number
  /** Advance width including letter spacing after every character. */
  w: number
  /** Per-character advances (only for words drawn with letter spacing). */
  chars?: { t: string; w: number }[]
}

// Characters that must not begin / end a line (simplified kinsoku shori, covers zh + ja).
const NO_START = new Set(Array.from('、。，．,.：:；;！!？?）)］]｝}」』】〕〉》”’…‥ー々ゝゞぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ・〜～%‰℃'))
const NO_END = new Set(Array.from('（(［[｛{「『【〔〈《“‘'))
const RE_WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}　-〿＀-￯]/u
const RE_NEUTRAL = /[—…“”‘’·]/u
const RE_SPACE = /\s/u

const segmenter: { segment(s: string): Iterable<{ segment: string }> } | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

function graphemes(s: string): string[] {
  if (!segmenter) return Array.from(s)
  const out: string[] = []
  for (const g of segmenter.segment(s)) out.push(g.segment)
  return out
}

let measureCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null
function getMeasureCtx() {
  if (!measureCtx) {
    measureCtx =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(8, 8).getContext('2d')
        : document.createElement('canvas').getContext('2d')
  }
  if (!measureCtx) throw new Error('Canvas 2D is not available')
  return measureCtx
}

/** Width cache; cleared whenever fonts finish loading so fallback metrics are not reused. */
const widthCache = new Map<string, number>()
export function clearMeasureCache() {
  widthCache.clear()
}

export interface LayoutExtras {
  /** Localised date string shown in the header or footer. */
  dateText: string
}

export function computeLayout(raw: string, s: Settings, extras: LayoutExtras): Layout {
  const font = getFont(s.fontId)
  const palette = getPalette(s.paletteId)
  const ctx = getMeasureCtx()
  const fonts: string[] = []
  const fontIndex = new Map<string, number>()
  const fontId = (weight: number, size: number) => {
    const key = cssFont(font, weight, size)
    let i = fontIndex.get(key)
    if (i === undefined) {
      i = fonts.length
      fonts.push(key)
      fontIndex.set(key, i)
    }
    return i
  }
  let currentFont = -1
  const measure = (f: number, t: string) => {
    const key = f + '\u0000' + fonts[f] + '\u0000' + t
    let w = widthCache.get(key)
    if (w === undefined) {
      if (currentFont !== f) {
        ctx.font = fonts[f]
        currentFont = f
      }
      w = ctx.measureText(t).width
      widthCache.set(key, w)
    }
    return w
  }

  const ls = s.letterSpacing
  const pad = s.padding
  const left = pad
  const contentW = LOGICAL_WIDTH - pad * 2
  const ops: Op[] = []
  const bgOps: Op[] = []
  let y = pad

  // ---- tokenising -------------------------------------------------------
  function tokenize(spans: Span[], size: number, forceBold: boolean, maxW: number): Unit[] {
    const units: Unit[] = []
    for (const span of spans) {
      const f = fontId(span.bold || forceBold ? font.bold : font.regular, size)
      let word = ''
      const flush = () => {
        if (!word) return
        pushWord(units, word, f, maxW)
        word = ''
      }
      for (const g of graphemes(span.text)) {
        if (RE_SPACE.test(g)) {
          flush()
          units.push({ text: ' ', kind: 'space', f, w: measure(f, ' ') + ls })
        } else if (RE_WIDE.test(g) || (RE_NEUTRAL.test(g) && !word)) {
          flush()
          units.push({ text: g, kind: 'cjk', f, w: measure(f, g) + ls })
        } else {
          word += g
        }
      }
      flush()
    }
    return units
  }

  function pushWord(units: Unit[], word: string, f: number, maxW: number) {
    const chars = graphemes(word)
    const charWs = chars.map((t) => ({ t, w: measure(f, t) + ls }))
    const w = ls === 0 ? measure(f, word) : charWs.reduce((a, c) => a + c.w, 0)
    if (w <= maxW) {
      units.push({ text: word, kind: 'word', f, w, chars: ls === 0 ? undefined : charWs })
      return
    }
    // Words longer than a line (URLs, hashes) break anywhere.
    for (const c of charWs) units.push({ text: c.t, kind: 'cjk', f, w: c.w })
  }

  // ---- line breaking ----------------------------------------------------
  const firstChar = (u: Unit) => u.text[0]
  const lastChar = (u: Unit) => u.text[u.text.length - 1]
  const trimEnd = (line: Unit[]) => {
    while (line.length && line[line.length - 1].kind === 'space') line.pop()
    return line
  }
  const widthOf = (line: Unit[]) => line.reduce((a, u) => a + u.w, 0)

  function breakLines(units: Unit[], firstAvail: number, avail: number): Unit[][] {
    const lines: Unit[][] = []
    let cur: Unit[] = []
    let w = 0
    const max = () => (lines.length === 0 ? firstAvail : avail)
    for (const u of units) {
      if (!cur.length && u.kind === 'space') continue
      if (w + u.w - ls <= max() + 0.01 || !cur.length) {
        cur.push(u)
        w += u.w
        continue
      }
      if (u.kind === 'space') {
        lines.push(trimEnd(cur))
        cur = []
        w = 0
        continue
      }
      trimEnd(cur)
      const carry: Unit[] = []
      // Pull characters down until the new line doesn't start with closing punctuation
      // (handles runs such as "PNG」。").
      let head = u
      while (NO_START.has(firstChar(head)) && cur.length > 1) {
        head = cur.pop()!
        carry.unshift(head)
        trimEnd(cur)
      }
      while (cur.length > 1 && NO_END.has(lastChar(cur[cur.length - 1]))) carry.unshift(cur.pop()!)
      lines.push(trimEnd(cur))
      cur = [...carry, u]
      w = widthOf(cur)
    }
    if (cur.length) lines.push(trimEnd(cur))
    return lines
  }

  // ---- emitting ---------------------------------------------------------
  interface ParaStyle {
    size: number
    bold: boolean
    lineHeight: number
    x: number
    width: number
    firstIndent: number
    align: Settings['align']
    color: string
  }

  function emitParagraph(spans: Span[], st: ParaStyle): void {
    const lh = st.size * st.lineHeight
    const units = tokenize(spans, st.size, st.bold, st.width - st.firstIndent)
    const lines = units.length ? breakLines(units, st.width - st.firstIndent, st.width) : [[]]
    lines.forEach((line, li) => {
      const isLast = li === lines.length - 1
      const offset = li === 0 ? st.firstIndent : 0
      const avail = st.width - offset
      const natural = Math.max(0, widthOf(line) - ls)
      let x = st.x + offset
      let gap = 0
      if (st.align === 'center') x += Math.max(0, (avail - natural) / 2)
      else if (st.align === 'justify' && !isLast && line.length > 1) {
        const extra = avail - natural
        if (extra > 0 && extra < avail * 0.35) gap = extra / (line.length - 1)
      }
      const glyphs: Glyph[] = []
      for (const u of line) {
        if (u.kind !== 'space') {
          if (u.chars) {
            let cx = x
            for (const c of u.chars) {
              glyphs.push({ t: c.t, x: cx, f: u.f })
              cx += c.w
            }
          } else glyphs.push({ t: u.text, x, f: u.f })
        }
        x += u.w + gap
      }
      ops.push({ k: 'text', top: y, bottom: y + lh, baseline: y + lh / 2, color: st.color, glyphs })
      y += lh
    })
  }

  const size = s.fontSize
  const bodyLH = s.lineHeight
  const headLH = Math.min(bodyLH, 1.5)
  const indentW = s.indent && s.align !== 'center' ? (size + ls) * 2 : 0
  const body = (over: Partial<ParaStyle> = {}): ParaStyle => ({
    size,
    bold: false,
    lineHeight: bodyLH,
    x: left,
    width: contentW,
    firstIndent: 0,
    align: s.align,
    color: palette.text,
    ...over,
  })

  // ---- header -----------------------------------------------------------
  const title = s.title.trim()
  if (title) {
    emitParagraph([{ text: title, bold: true }], body({ size: size * 1.55, bold: true, lineHeight: 1.4, align: s.align === 'center' ? 'center' : 'left' }))
    if (s.showDate && extras.dateText) {
      y += size * 0.35
      emitParagraph([{ text: extras.dateText, bold: false }], body({ size: size * 0.78, lineHeight: 1.5, color: palette.muted, align: s.align === 'center' ? 'center' : 'left' }))
    }
    y += size * 0.9
    bgOps.push({ k: 'rect', top: y, bottom: y + 1, x: left, w: contentW, color: palette.rule, r: 0 })
    y += size * 1.2
  }

  // ---- body -------------------------------------------------------------
  const blocks: Block[] = parseText(raw, { pangu: s.pangu, collapseBlank: s.collapseBlank, markdown: s.markdown })
  const isEmpty = blocks.length === 0
  let prev: Block | null = null
  let quoteTop = -1
  const closeQuote = () => {
    if (quoteTop < 0) return
    const qPad = size * 0.55
    bgOps.push({ k: 'rect', top: quoteTop - qPad, bottom: y + qPad, x: left, w: contentW, color: palette.quoteBg, r: 6 })
    bgOps.push({ k: 'rect', top: quoteTop - qPad, bottom: y + qPad, x: left, w: 3, color: palette.accent, r: 1.5 })
    y += qPad
    quoteTop = -1
  }

  for (const b of blocks) {
    if (b.type !== 'quote') closeQuote()
    if (prev) {
      if (b.type === 'quote' && prev.type === 'quote') y += size * 0.3
      else if ((b.type === 'li' || b.type === 'ol') && (prev.type === 'li' || prev.type === 'ol')) y += Math.min(s.paragraphSpacing, size * 0.4)
      else if (b.type === 'blank' || prev.type === 'blank') y += 0
      else y += s.paragraphSpacing
    }
    switch (b.type) {
      case 'blank':
        y += size * bodyLH
        break
      case 'h1':
      case 'h2':
      case 'h3': {
        const scale = b.type === 'h1' ? 1.4 : b.type === 'h2' ? 1.22 : 1.08
        if (prev) y += size * 0.6
        emitParagraph(b.spans, body({ size: size * scale, bold: true, lineHeight: headLH, align: s.align === 'justify' ? 'left' : s.align }))
        y += size * 0.15
        break
      }
      case 'quote': {
        if (quoteTop < 0) {
          y += size * 0.55
          quoteTop = y
        }
        const inset = size * 0.9
        emitParagraph(b.spans, body({ x: left + inset, width: contentW - inset - size * 0.6 }))
        break
      }
      case 'li':
      case 'ol': {
        const markerW = b.type === 'li' ? size * 1.15 : size * 1.7
        const f = fontId(font.regular, size)
        const lh = size * bodyLH
        ops.push({
          k: 'text',
          top: y,
          bottom: y + lh,
          baseline: y + lh / 2,
          color: b.type === 'li' ? palette.accent : palette.muted,
          glyphs: [{ t: b.type === 'li' ? '•' : b.marker ?? '', x: left + (b.type === 'li' ? size * 0.2 : 0), f }],
        })
        emitParagraph(b.spans, body({ x: left + markerW, width: contentW - markerW, align: s.align === 'center' ? 'left' : s.align }))
        break
      }
      case 'hr': {
        y += size * 0.6
        const w = Math.min(contentW, 64)
        bgOps.push({ k: 'rect', top: y, bottom: y + 2, x: left + (contentW - w) / 2, w, color: palette.rule, r: 1 })
        y += 2 + size * 0.6
        break
      }
      default:
        emitParagraph(b.spans, body({ firstIndent: indentW }))
    }
    prev = b
  }
  closeQuote()

  // ---- footer -----------------------------------------------------------
  const footerParts = [s.footer.trim(), !title && s.showDate ? extras.dateText : ''].filter(Boolean)
  if (footerParts.length) {
    y += size * 1.8
    bgOps.push({ k: 'rect', top: y, bottom: y + 1, x: left, w: contentW, color: palette.rule, r: 0 })
    y += size * 1.1
    emitParagraph([{ text: footerParts.join('  ·  '), bold: false }], body({ size: size * 0.74, lineHeight: 1.6, color: palette.muted, align: 'center' }))
  }

  y += pad
  return { width: LOGICAL_WIDTH, height: Math.ceil(y), fonts, ops: [...bgOps, ...ops], palette, isEmpty }
}

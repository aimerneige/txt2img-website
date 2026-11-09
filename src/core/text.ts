export interface ProcessOptions {
  /** Insert a space between CJK and Latin letters/digits. */
  pangu: boolean
  /** Merge runs of blank lines (paragraph spacing already separates paragraphs). */
  collapseBlank: boolean
  /** Interpret a small Markdown subset: headings, quotes, lists, rules, **bold**. */
  markdown: boolean
}

export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'li' | 'ol' | 'hr' | 'blank'

export interface Span {
  text: string
  bold: boolean
}

export interface Block {
  type: BlockType
  spans: Span[]
  /** Marker for ordered list items, e.g. "3." */
  marker?: string
}

const CJK = '\\u2e80-\\u2fdf\\u3040-\\u30ff\\u3100-\\u312f\\u31a0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff'
const PANGU_LEFT = new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g')
const PANGU_RIGHT = new RegExp(`([A-Za-z0-9%])([${CJK}])`, 'g')

export function panguSpacing(line: string): string {
  return line.replace(PANGU_LEFT, '$1 $2').replace(PANGU_RIGHT, '$1 $2')
}

function parseInline(text: string, markdown: boolean): Span[] {
  if (!markdown || !text.includes('**')) return [{ text, bold: false }]
  const spans: Span[] = []
  const parts = text.split('**')
  // An unmatched trailing "**" is kept literally.
  const balanced = parts.length % 2 === 1
  parts.forEach((part, i) => {
    if (!balanced && i === parts.length - 1) {
      spans.push({ text: (i > 0 ? '**' : '') + part, bold: false })
      return
    }
    if (part) spans.push({ text: part, bold: i % 2 === 1 })
  })
  return spans.length ? spans : [{ text: '', bold: false }]
}

export function parseText(raw: string, opts: ProcessOptions): Block[] {
  const lines = raw.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  const blocks: Block[] = []
  // One blank line is an ordinary paragraph break; every extra one adds an empty line
  // (unless collapsing is on).
  let blankRun = 0
  for (let line of lines) {
    line = line.replace(/\s+$/u, '')
    if (opts.pangu) line = panguSpacing(line)
    if (!line.trim()) {
      if (!opts.collapseBlank && blankRun++ > 0) blocks.push({ type: 'blank', spans: [] })
      continue
    }
    blankRun = 0
    if (opts.markdown) {
      const t = line.trim()
      let m: RegExpMatchArray | null
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
        blocks.push({ type: 'hr', spans: [] })
        continue
      }
      if ((m = t.match(/^(#{1,3})\s+(.*)$/))) {
        blocks.push({ type: (`h${m[1].length}`) as BlockType, spans: parseInline(m[2], true) })
        continue
      }
      if ((m = t.match(/^>\s?(.*)$/))) {
        blocks.push({ type: 'quote', spans: parseInline(m[1], true) })
        continue
      }
      if ((m = t.match(/^[-*+]\s+(.*)$/))) {
        blocks.push({ type: 'li', spans: parseInline(m[1], true) })
        continue
      }
      if ((m = t.match(/^(\d{1,3})[.)]\s+(.*)$/))) {
        blocks.push({ type: 'ol', marker: `${m[1]}.`, spans: parseInline(m[2], true) })
        continue
      }
    }
    // Strip leading whitespace; first-line indent is a layout option instead.
    blocks.push({ type: 'p', spans: parseInline(line.replace(/^[\s　]+/u, ''), opts.markdown) })
  }
  while (blocks.length && blocks[blocks.length - 1].type === 'blank') blocks.pop()
  while (blocks.length && blocks[0].type === 'blank') blocks.shift()
  return blocks
}

export function countChars(text: string): number {
  let n = 0
  for (const ch of text) if (!/\s/u.test(ch)) n++
  return n
}

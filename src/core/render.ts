import type { Layout } from './layout'
import { canStreamPng, encodePngStreaming } from './png'

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** Draw the logical rows [y0, y0 + h) of the layout, scaled by `scale`, into ctx at (0, 0). */
export function drawRegion(ctx: Ctx2D, layout: Layout, scale: number, y0: number, h: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = layout.palette.bg
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.setTransform(scale, 0, 0, scale, 0, -y0 * scale)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const y1 = y0 + h
  let font = -1
  for (const op of layout.ops) {
    if (op.bottom < y0 - 4 || op.top > y1 + 4) continue
    if (op.k === 'rect') {
      ctx.fillStyle = op.color
      ctx.beginPath()
      if (op.r > 0 && 'roundRect' in ctx) ctx.roundRect(op.x, op.top, op.w, op.bottom - op.top, op.r)
      else ctx.rect(op.x, op.top, op.w, op.bottom - op.top)
      ctx.fill()
      continue
    }
    ctx.fillStyle = op.color
    for (const g of op.glyphs) {
      if (g.f !== font) {
        ctx.font = layout.fonts[g.f]
        font = g.f
      }
      ctx.fillText(g.t, g.x, op.baseline)
    }
  }
}

// ---- preview ------------------------------------------------------------

const PREVIEW_TILE_PX = 4096

/** Render the layout into a stack of canvases inside `host`, reusing existing ones. */
export function renderPreview(host: HTMLElement, layout: Layout, cssWidth: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const scale = (cssWidth * dpr) / layout.width
  const pxW = Math.round(layout.width * scale)
  const totalPx = Math.ceil(layout.height * scale)
  const tiles = Math.max(1, Math.ceil(totalPx / PREVIEW_TILE_PX))
  const existing = Array.from(host.querySelectorAll('canvas'))
  for (let i = tiles; i < existing.length; i++) existing[i].remove()
  for (let i = 0; i < tiles; i++) {
    let c = existing[i]
    if (!c) {
      c = document.createElement('canvas')
      host.appendChild(c)
    }
    const rowStart = i * PREVIEW_TILE_PX
    const rows = Math.min(PREVIEW_TILE_PX, totalPx - rowStart)
    if (c.width !== pxW) c.width = pxW
    if (c.height !== rows) c.height = rows
    c.style.aspectRatio = `${pxW} / ${rows}`
    const ctx = c.getContext('2d')
    if (!ctx) continue
    drawRegion(ctx, layout, scale, rowStart / scale, rows / scale)
  }
}

// ---- export -------------------------------------------------------------

/** Conservative single-canvas limits that work on iOS Safari, Android and desktop. */
const MAX_CANVAS_SIDE = 16384
const MAX_CANVAS_AREA = 16_000_000

export function exportSize(layout: Layout, outWidth: number) {
  const scale = outWidth / layout.width
  return { width: outWidth, height: Math.ceil(layout.height * scale), scale }
}

export async function exportPng(layout: Layout, outWidth: number, onProgress?: (p: number) => void): Promise<Blob> {
  const { width, height, scale } = exportSize(layout, outWidth)
  if (height <= MAX_CANVAS_SIDE && width * height <= MAX_CANVAS_AREA) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    drawRegion(ctx, layout, scale, 0, layout.height)
    onProgress?.(0.6)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('toBlob')
    onProgress?.(1)
    return blob
  }
  if (!canStreamPng()) throw new Error('too-tall')
  const strip = Math.max(64, Math.floor(2_000_000 / width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = strip
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas')
  const blob = await encodePngStreaming(
    width,
    height,
    strip,
    (row, rows) => {
      drawRegion(ctx, layout, scale, row / scale, strip / scale)
      return ctx.getImageData(0, 0, width, rows).data
    },
    onProgress,
  )
  canvas.width = canvas.height = 0
  return blob
}

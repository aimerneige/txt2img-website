// Minimal streaming PNG encoder (RGB, 8-bit, "Sub" filter) built on CompressionStream.
// Lets us export images far taller than a single <canvas> may be (iOS caps canvases at ~16.7M px).

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(parts: Uint8Array<ArrayBuffer>[]): number {
  let c = 0xffffffff
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer>[] {
  const head = new Uint8Array(8)
  const view = new DataView(head.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) head[4 + i] = type.charCodeAt(i)
  const crc = new Uint8Array(4)
  new DataView(crc.buffer).setUint32(0, crc32([head.subarray(4), data]))
  return [head, data, crc]
}

export const canStreamPng = () => typeof CompressionStream !== 'undefined'

/**
 * @param drawStrip renders rows [row, row + rows) and returns their RGBA pixels.
 */
export async function encodePngStreaming(
  width: number,
  height: number,
  stripRows: number,
  drawStrip: (row: number, rows: number) => Uint8ClampedArray,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const cs = new CompressionStream('deflate') // zlib wrapper, exactly what IDAT expects
  const writer = cs.writable.getWriter()
  const compressed = new Response(cs.readable).arrayBuffer()
  const stride = width * 3 + 1
  for (let row = 0; row < height; row += stripRows) {
    const rows = Math.min(stripRows, height - row)
    const rgba = drawStrip(row, rows)
    const out = new Uint8Array(stride * rows)
    for (let r = 0; r < rows; r++) {
      const o = r * stride
      const s = r * width * 4
      out[o] = 1 // Sub filter: flat backgrounds compress very well
      let pr = 0, pg = 0, pb = 0
      for (let x = 0; x < width; x++) {
        const si = s + x * 4
        const oi = o + 1 + x * 3
        const cr = rgba[si], cg = rgba[si + 1], cb = rgba[si + 2]
        out[oi] = cr - pr
        out[oi + 1] = cg - pg
        out[oi + 2] = cb - pb
        pr = cr; pg = cg; pb = cb
      }
    }
    await writer.write(out)
    onProgress?.(Math.min(1, (row + rows) / height))
    await new Promise((r) => setTimeout(r, 0))
  }
  await writer.close()
  const idat = new Uint8Array(await compressed)

  const ihdr = new Uint8Array(13)
  const v = new DataView(ihdr.buffer)
  v.setUint32(0, width)
  v.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: RGB
  const parts: BlobPart[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...chunk('IHDR', ihdr)]
  const MAX = 1 << 20
  for (let i = 0; i < idat.length; i += MAX) parts.push(...chunk('IDAT', idat.subarray(i, i + MAX)))
  parts.push(...chunk('IEND', new Uint8Array(0)))
  return new Blob(parts, { type: 'image/png' })
}

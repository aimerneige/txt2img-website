import { defineConfig, type Plugin } from 'vite'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FONT_LICENSE_SOURCES } from './src/core/font-licenses'

/** Fontsource CSS lists woff2 + woff; every browser we target reads woff2, so drop the woff copies. */
function woff2Only(): Plugin {
  return {
    name: 'woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/@fontsource[\\/].+\.css$/.test(id)) return null
      return code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, '')
    },
  }
}

/** Ship each font's OFL license text next to the font files (OFL §2). */
function fontLicenses(): Plugin {
  return {
    name: 'font-licenses',
    generateBundle() {
      for (const { id, path } of FONT_LICENSE_SOURCES) {
        const abs = fileURLToPath(new URL(`./node_modules/${path}`, import.meta.url))
        if (!existsSync(abs)) this.error(`Missing font license: ${abs}`)
        this.emitFile({ type: 'asset', fileName: `licenses/${id}.txt`, source: readFileSync(abs) })
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [woff2Only(), fontLicenses()],
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 800 },
})

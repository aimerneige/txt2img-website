export type Theme = 'light' | 'dark'

const KEY = 'txt2img:theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export const currentTheme = (): Theme => (document.documentElement.dataset.theme as Theme) || (media.matches ? 'dark' : 'light')

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111317' : '#f5f6f8')
}

/** Follow the OS until the user picks a theme explicitly. */
export function initTheme(onChange: () => void) {
  apply(stored() ?? (media.matches ? 'dark' : 'light'))
  media.addEventListener('change', (e) => {
    if (stored()) return
    apply(e.matches ? 'dark' : 'light')
    onChange()
  })
}

/** Toggle with a circular reveal from the clicked point when View Transitions are available. */
export function toggleTheme(origin: { x: number; y: number } | null, onChange: () => void) {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* ignore */
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
  if (!doc.startViewTransition || reduce || !origin) {
    apply(next)
    onChange()
    return
  }
  const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
  const vt = doc.startViewTransition(() => {
    apply(next)
    onChange()
  })
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => undefined)
}

import { icons } from './icons'

/** Styled dialog with focus trapping, Escape / backdrop to close and enter/leave animations. */
export function createModal(opts: { className?: string; closeLabel: () => string }) {
  const root = document.createElement('div')
  root.className = `modal ${opts.className ?? ''}`
  root.hidden = true
  root.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-panel" role="dialog" aria-modal="true" tabindex="-1">
      <header class="modal-head"><h2 class="modal-title"></h2>
        <button type="button" class="icon-btn modal-close">${icons.x}</button></header>
      <div class="modal-body"></div>
    </div>`
  document.body.appendChild(root)
  const panel = root.querySelector<HTMLElement>('.modal-panel')!
  const title = root.querySelector<HTMLElement>('.modal-title')!
  const body = root.querySelector<HTMLElement>('.modal-body')!
  const closeBtn = root.querySelector<HTMLButtonElement>('.modal-close')!
  let lastFocus: HTMLElement | null = null

  const focusables = () =>
    Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      const f = focusables()
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  function open() {
    lastFocus = document.activeElement as HTMLElement
    root.hidden = false
    root.classList.remove('leaving')
    document.documentElement.classList.add('no-scroll')
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => panel.focus())
  }

  function close() {
    if (root.hidden) return
    root.classList.add('leaving')
    document.removeEventListener('keydown', onKey)
    document.documentElement.classList.remove('no-scroll')
    setTimeout(() => {
      root.hidden = true
      root.classList.remove('leaving')
    }, 220)
    lastFocus?.focus({ preventScroll: true })
  }

  root.querySelector('.modal-backdrop')!.addEventListener('click', close)
  closeBtn.addEventListener('click', close)

  return {
    open,
    close,
    body,
    setTitle(text: string) {
      title.textContent = text
      panel.setAttribute('aria-label', text)
      closeBtn.setAttribute('aria-label', opts.closeLabel())
      closeBtn.dataset.tip = opts.closeLabel()
    },
  }
}

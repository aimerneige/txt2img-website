import { icons } from './icons'

export type ToastKind = 'success' | 'error' | 'info'

interface ToastOptions {
  kind?: ToastKind
  action?: { label: string; run: () => void }
  duration?: number
}

let host: HTMLElement | null = null

function getHost() {
  if (!host) {
    host = document.createElement('div')
    host.className = 'toast-host'
    host.setAttribute('role', 'status')
    host.setAttribute('aria-live', 'polite')
    document.body.appendChild(host)
  }
  return host
}

export function toast(message: string, opts: ToastOptions = {}) {
  const kind = opts.kind ?? 'info'
  const el = document.createElement('div')
  el.className = `toast toast-${kind}`
  const icon = kind === 'success' ? icons.checkCircle : kind === 'error' ? icons.alert : icons.info
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg"></span>`
  el.querySelector('.toast-msg')!.textContent = message
  let timer = 0
  const dismiss = () => {
    clearTimeout(timer)
    el.classList.add('toast-leave')
    el.addEventListener('animationend', () => el.remove(), { once: true })
    setTimeout(() => el.remove(), 400)
  }
  if (opts.action) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'toast-action'
    btn.textContent = opts.action.label
    btn.addEventListener('click', () => {
      opts.action!.run()
      dismiss()
    })
    el.appendChild(btn)
  }
  const h = getHost()
  // Keep at most three on screen.
  while (h.children.length >= 3) h.firstElementChild?.remove()
  h.appendChild(el)
  const duration = opts.duration ?? (opts.action ? 5000 : 2600)
  const arm = () => (timer = window.setTimeout(dismiss, duration))
  el.addEventListener('pointerenter', () => clearTimeout(timer))
  el.addEventListener('pointerleave', arm)
  arm()
}

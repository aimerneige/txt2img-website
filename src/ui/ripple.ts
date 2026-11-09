const SELECTOR = '.btn, .icon-btn, .seg-btn, .swatch, .select-trigger, .chip'

/** Material-style ink ripple from the pointer position, delegated for every interactive control. */
export function installRipple(root: HTMLElement = document.body) {
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    const target = (e.target as HTMLElement).closest<HTMLElement>(SELECTOR)
    if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return
    const rect = target.getBoundingClientRect()
    const size = Math.hypot(rect.width, rect.height) * 2
    const ink = document.createElement('span')
    ink.className = 'ripple'
    ink.style.width = ink.style.height = `${size}px`
    ink.style.left = `${e.clientX - rect.left - size / 2}px`
    ink.style.top = `${e.clientY - rect.top - size / 2}px`
    // Ripples live in a clipping layer so the control itself can let tooltips overflow.
    let box = target.querySelector<HTMLElement>(':scope > .ripple-box')
    if (!box) {
      box = document.createElement('span')
      box.className = 'ripple-box'
      target.prepend(box)
    }
    box.appendChild(ink)
    const release = () => {
      ink.classList.add('ripple-out')
      setTimeout(() => ink.remove(), 500)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  })
}

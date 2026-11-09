import { icons } from './icons'

export interface SelectOption<T> {
  value: T
  /** Fills an option row (and the trigger for the selected option). Called again on refresh(). */
  render: (el: HTMLElement, where: 'option' | 'trigger') => void
}

interface SelectConfig<T> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  label: () => string
  className?: string
  leadingIcon?: string
  /** Popover alignment relative to the trigger. */
  align?: 'start' | 'end'
}

let uid = 0
let openInstance: { close: (focus?: boolean) => void } | null = null

const narrow = () => window.matchMedia('(max-width: 640px)').matches

/**
 * Accessible, fully styled replacement for <select> (WAI-ARIA listbox pattern).
 * The popover is portalled to <body> so no ancestor stacking context or overflow can clip it;
 * on small screens it turns into a bottom sheet.
 */
export function createSelect<T>(cfg: SelectConfig<T>) {
  const id = `sel-${++uid}`
  let value = cfg.value
  let active = 0

  const root = document.createElement('div')
  root.className = `select ${cfg.className ?? ''}`

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'select-trigger'
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.setAttribute('aria-controls', `${id}-list`)
  trigger.innerHTML = `${cfg.leadingIcon ?? ''}<span class="select-value"></span><span class="select-chevron">${icons.chevronDown}</span>`
  const valueEl = trigger.querySelector<HTMLElement>('.select-value')!
  root.appendChild(trigger)

  const backdrop = document.createElement('div')
  backdrop.className = 'select-backdrop'

  const pop = document.createElement('div')
  pop.className = `select-pop ${cfg.className ? cfg.className + '-pop' : ''}`
  pop.innerHTML = `<div class="select-sheet-handle"></div><div class="select-sheet-title"></div>`
  const sheetTitle = pop.querySelector<HTMLElement>('.select-sheet-title')!

  const list = document.createElement('div')
  list.className = 'select-list'
  list.id = `${id}-list`
  list.setAttribute('role', 'listbox')
  list.tabIndex = -1
  pop.appendChild(list)
  document.body.append(backdrop, pop)

  const optionEls: HTMLElement[] = []
  cfg.options.forEach((_opt, i) => {
    const el = document.createElement('div')
    el.className = 'select-option'
    el.id = `${id}-opt-${i}`
    el.setAttribute('role', 'option')
    el.innerHTML = `<span class="select-option-body"></span><span class="select-check">${icons.check}</span>`
    el.addEventListener('click', () => choose(i))
    el.addEventListener('pointermove', () => setActive(i, false))
    optionEls.push(el)
    list.appendChild(el)
  })

  function refresh() {
    const label = cfg.label()
    trigger.setAttribute('aria-label', label)
    list.setAttribute('aria-label', label)
    sheetTitle.textContent = label
    cfg.options.forEach((opt, i) => {
      const body = optionEls[i].querySelector<HTMLElement>('.select-option-body')!
      body.replaceChildren()
      opt.render(body, 'option')
      const selected = opt.value === value
      optionEls[i].setAttribute('aria-selected', String(selected))
      if (selected) {
        valueEl.replaceChildren()
        opt.render(valueEl, 'trigger')
      }
    })
  }

  function setActive(i: number, scroll = true) {
    active = (i + optionEls.length) % optionEls.length
    optionEls.forEach((el, j) => el.classList.toggle('active', j === active))
    list.setAttribute('aria-activedescendant', optionEls[active].id)
    if (scroll) optionEls[active].scrollIntoView({ block: 'nearest' })
  }

  function position() {
    const s = pop.style
    if (narrow()) {
      for (const p of ['top', 'bottom', 'left', 'right', 'min-width', '--max-h']) s.removeProperty(p)
      pop.classList.remove('flip')
      return
    }
    const r = trigger.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 16
    const above = r.top - 16
    const flip = below < 260 && above > below
    pop.classList.toggle('flip', flip)
    s.setProperty('--max-h', `${Math.max(160, Math.min(380, flip ? above : below))}px`)
    s.minWidth = `${r.width}px`
    if (flip) {
      s.top = 'auto'
      s.bottom = `${window.innerHeight - r.top + 8}px`
    } else {
      s.bottom = 'auto'
      s.top = `${r.bottom + 8}px`
    }
    if (cfg.align === 'end') {
      s.left = 'auto'
      s.right = `${document.documentElement.clientWidth - r.right}px`
    } else {
      s.right = 'auto'
      s.left = `${r.left}px`
    }
  }

  const isOpen = () => root.classList.contains('open')

  function open() {
    if (isOpen()) return
    openInstance?.close(false)
    openInstance = api
    position()
    root.classList.add('open')
    pop.classList.add('open')
    backdrop.classList.add('open')
    trigger.setAttribute('aria-expanded', 'true')
    const idx = cfg.options.findIndex((o) => o.value === value)
    setActive(idx < 0 ? 0 : idx)
    requestAnimationFrame(() => list.focus({ preventScroll: true }))
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', onScroll, true)
  }

  function close(focus = true) {
    if (!isOpen()) return
    root.classList.remove('open')
    pop.classList.remove('open')
    backdrop.classList.remove('open')
    trigger.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('resize', position)
    window.removeEventListener('scroll', onScroll, true)
    if (openInstance === api) openInstance = null
    if (focus) trigger.focus({ preventScroll: true })
  }

  function onScroll(e: Event) {
    // Scrolling inside the list is fine; scrolling the page moves the anchor.
    if (pop.contains(e.target as Node)) return
    if (narrow()) return
    position()
  }

  function choose(i: number) {
    const opt = cfg.options[i]
    close()
    if (opt.value !== value) {
      value = opt.value
      refresh()
      cfg.onChange(value)
    }
  }

  function onOutside(e: Event) {
    const t = e.target as Node
    if (!pop.contains(t) && !trigger.contains(t) && t !== backdrop) close(false)
  }

  trigger.addEventListener('click', () => (isOpen() ? close() : open()))
  trigger.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault()
      open()
    }
  })
  backdrop.addEventListener('click', () => close())

  let typeahead = ''
  let typeTimer = 0
  list.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive(active + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive(active - 1)
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(optionEls.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        close()
        break
      case 'Tab':
        e.preventDefault()
        close()
        break
      default:
        if (e.key.length === 1) {
          typeahead += e.key.toLowerCase()
          clearTimeout(typeTimer)
          typeTimer = window.setTimeout(() => (typeahead = ''), 600)
          const hit = optionEls.findIndex((el) => el.textContent?.toLowerCase().startsWith(typeahead))
          if (hit >= 0) setActive(hit)
        }
    }
  })

  const api = {
    el: root,
    close,
    refresh,
    setValue(v: T) {
      value = v
      refresh()
    },
    /** Remove the portalled popover (call when the trigger is discarded). */
    destroy() {
      close(false)
      pop.remove()
      backdrop.remove()
    },
  }
  refresh()
  return api
}

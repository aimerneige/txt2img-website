// Small custom form controls: slider, segmented control, switch.

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

interface SliderConfig {
  label: () => string
  min: number
  max: number
  step: number
  value: number
  defaultValue: number
  format: (v: number) => string
  onInput: (v: number) => void
}

export function createSlider(cfg: SliderConfig) {
  let value = cfg.value
  const decimals = (String(cfg.step).split('.')[1] ?? '').length

  const root = document.createElement('div')
  root.className = 'slider'
  root.innerHTML = `
    <div class="slider-head">
      <span class="slider-label"></span>
      <span class="slider-value"></span>
    </div>
    <div class="slider-track" role="slider" tabindex="0">
      <div class="slider-rail"><div class="slider-fill"></div><div class="slider-default"></div></div>
      <div class="slider-thumb"></div>
    </div>`
  const labelEl = root.querySelector<HTMLElement>('.slider-label')!
  const valueEl = root.querySelector<HTMLElement>('.slider-value')!
  const track = root.querySelector<HTMLElement>('.slider-track')!
  const defMark = root.querySelector<HTMLElement>('.slider-default')!

  const ratio = (v: number) => (v - cfg.min) / (cfg.max - cfg.min)
  const snap = (v: number) => Number(clamp(Math.round((v - cfg.min) / cfg.step) * cfg.step + cfg.min, cfg.min, cfg.max).toFixed(decimals))

  function paint() {
    root.style.setProperty('--p', String(ratio(value)))
    valueEl.textContent = cfg.format(value)
    track.setAttribute('aria-valuemin', String(cfg.min))
    track.setAttribute('aria-valuemax', String(cfg.max))
    track.setAttribute('aria-valuenow', String(value))
    track.setAttribute('aria-valuetext', cfg.format(value))
  }

  function set(v: number, emit = true) {
    const next = snap(v)
    if (next === value) return
    value = next
    paint()
    if (emit) cfg.onInput(value)
  }

  function fromPointer(e: PointerEvent) {
    const r = track.getBoundingClientRect()
    const thumb = 20
    const p = clamp((e.clientX - r.left - thumb / 2) / (r.width - thumb), 0, 1)
    set(cfg.min + p * (cfg.max - cfg.min))
  }

  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    track.setPointerCapture(e.pointerId)
    root.classList.add('dragging')
    fromPointer(e)
  })
  track.addEventListener('pointermove', (e) => {
    if (track.hasPointerCapture(e.pointerId)) fromPointer(e)
  })
  const end = (e: PointerEvent) => {
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId)
    root.classList.remove('dragging')
  }
  track.addEventListener('pointerup', end)
  track.addEventListener('pointercancel', end)

  track.addEventListener('keydown', (e) => {
    const big = (cfg.max - cfg.min) / 10
    const map: Record<string, number> = {
      ArrowRight: value + cfg.step,
      ArrowUp: value + cfg.step,
      ArrowLeft: value - cfg.step,
      ArrowDown: value - cfg.step,
      PageUp: value + big,
      PageDown: value - big,
      Home: cfg.min,
      End: cfg.max,
    }
    if (e.key in map) {
      e.preventDefault()
      set(map[e.key])
    }
  })
  // Double-click the value to go back to the default.
  valueEl.addEventListener('dblclick', () => set(cfg.defaultValue))
  track.addEventListener('dblclick', () => set(cfg.defaultValue))

  function refresh() {
    const l = cfg.label()
    labelEl.textContent = l
    track.setAttribute('aria-label', l)
    defMark.style.left = `calc(${ratio(cfg.defaultValue)} * 100%)`
    paint()
  }
  refresh()

  return {
    el: root,
    refresh,
    setValue: (v: number) => {
      value = snap(v)
      paint()
    },
  }
}

interface SegmentOption<T> {
  value: T
  label: () => string
  icon?: string
  /** Show only the icon, with the label as tooltip / accessible name. */
  iconOnly?: boolean
}

export function createSegmented<T>(cfg: { options: SegmentOption<T>[]; value: T; label: () => string; onChange: (v: T) => void }) {
  let value = cfg.value
  const root = document.createElement('div')
  root.className = 'segmented'
  root.setAttribute('role', 'radiogroup')
  const indicator = document.createElement('div')
  indicator.className = 'seg-indicator'
  root.appendChild(indicator)

  const buttons = cfg.options.map((_opt, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'seg-btn'
    b.setAttribute('role', 'radio')
    b.addEventListener('click', () => select(i, true))
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!d) return
      e.preventDefault()
      const n = (i + d + buttons.length) % buttons.length
      select(n, true)
      buttons[n].focus()
    })
    root.appendChild(b)
    return b
  })
  root.style.setProperty('--n', String(cfg.options.length))

  function paint() {
    const idx = Math.max(0, cfg.options.findIndex((o) => o.value === value))
    root.style.setProperty('--i', String(idx))
    buttons.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === idx))
      b.tabIndex = i === idx ? 0 : -1
    })
  }

  function select(i: number, emit: boolean) {
    const v = cfg.options[i].value
    if (v === value) return
    value = v
    paint()
    if (emit) cfg.onChange(v)
  }

  function refresh() {
    root.setAttribute('aria-label', cfg.label())
    cfg.options.forEach((opt, i) => {
      const b = buttons[i]
      const l = opt.label()
      if (opt.iconOnly) {
        b.innerHTML = opt.icon ?? ''
        b.setAttribute('aria-label', l)
        b.dataset.tip = l
      } else {
        b.innerHTML = `${opt.icon ?? ''}<span></span>`
        b.querySelector('span')!.textContent = l
      }
    })
    paint()
  }
  refresh()
  return {
    el: root,
    refresh,
    setValue: (v: T) => {
      value = v
      paint()
    },
  }
}

export function createSwitch(cfg: { label: () => string; hint?: () => string; value: boolean; onChange: (v: boolean) => void }) {
  let value = cfg.value
  const root = document.createElement('div')
  root.className = 'switch-row'
  root.innerHTML = `
    <div class="switch-text"><span class="switch-label"></span><span class="switch-hint"></span></div>
    <button type="button" class="switch" role="switch"><span class="switch-knob"></span></button>`
  const btn = root.querySelector<HTMLButtonElement>('.switch')!
  const labelEl = root.querySelector<HTMLElement>('.switch-label')!
  const hintEl = root.querySelector<HTMLElement>('.switch-hint')!
  const paint = () => btn.setAttribute('aria-checked', String(value))
  const toggle = () => {
    value = !value
    paint()
    cfg.onChange(value)
  }
  btn.addEventListener('click', toggle)
  root.querySelector('.switch-text')!.addEventListener('click', toggle)
  function refresh() {
    labelEl.textContent = cfg.label()
    btn.setAttribute('aria-label', cfg.label())
    hintEl.textContent = cfg.hint?.() ?? ''
    hintEl.hidden = !cfg.hint
    paint()
  }
  refresh()
  return {
    el: root,
    refresh,
    setValue: (v: boolean) => {
      value = v
      paint()
    },
  }
}

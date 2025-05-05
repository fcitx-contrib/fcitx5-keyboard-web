import type { Key, Style } from './layout'

export const DATA_KEY = 'data-key'

export function getKey(container: Element | null) {
  const dataKey = container?.getAttribute(DATA_KEY)
  if (dataKey) {
    return JSON.parse(dataKey) as Key
  }
  return null
}

export function getContainer(touch: Touch) {
  for (const container of document.querySelectorAll('.fcitx-keyboard-key-container')) {
    const box = container.getBoundingClientRect()
    if (touch.clientX >= box.left && touch.clientX <= box.right && touch.clientY >= box.top && touch.clientY <= box.bottom) {
      return container
    }
  }
  return null
}

export function div(klass: string, style?: Style) {
  const el = document.createElement('div')
  el.classList.add(klass)
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value !== undefined) {
      // @ts-expect-error This just works.
      el.style[key] = value
    }
  }
  return el
}

export function hide(element: HTMLElement) {
  element.classList.add('fcitx-keyboard-hidden')
}

export function show(element: HTMLElement) {
  element.classList.remove('fcitx-keyboard-hidden')
}

export function disable(element: Element) {
  element.classList.add('fcitx-keyboard-disabled')
}

export function enable(element: Element) {
  element.classList.remove('fcitx-keyboard-disabled')
}

export function press(element: Element) {
  element.classList.add('fcitx-keyboard-pressed')
}

export function release(element: Element) {
  element.classList.remove('fcitx-keyboard-pressed')
}

export function renderToolbarButton(svg: string) {
  const button = div('fcitx-keyboard-toolbar-button')
  button.innerHTML = svg
  button.addEventListener('touchstart', () => {
    press(button)
  })
  button.addEventListener('touchend', () => {
    release(button)
  })
  button.addEventListener('touchcancel', () => {
    release(button)
  })
  return button
}

export function getCandidateBar() {
  return document.querySelector('.fcitx-keyboard-candidate-bar') as HTMLElement
}

export function getStatusArea() {
  return document.querySelector('.fcitx-keyboard-status-area') as HTMLElement
}

export function getSymbolSelector() {
  return document.querySelector('.fcitx-keyboard-symbol-selector') as HTMLElement
}

export function setSvgStyle(container: HTMLElement, style: { [key: string]: string }) {
  const svg = container.querySelector('svg') as SVGElement
  for (const [k, v] of Object.entries(style)) {
    // @ts-expect-error too hard to annotate
    svg.style[k] = v
  }
}

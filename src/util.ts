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

export function renderToolbarButton(svg: string) {
  const button = div('fcitx-keyboard-toolbar-button')
  button.innerHTML = svg
  button.addEventListener('touchstart', () => {
    button.classList.add('fcitx-keyboard-pressed')
  })
  button.addEventListener('touchend', () => {
    button.classList.remove('fcitx-keyboard-pressed')
  })
  return button
}

export function getCandidateBar() {
  return document.querySelector('.fcitx-keyboard-candidates') as HTMLElement
}

export function getStatusArea() {
  return document.querySelector('.fcitx-keyboard-status-area') as HTMLElement
}

export type DisplayMode = 'initial' | 'candidates' | 'edit' | 'statusArea'

let displayMode: DisplayMode = 'initial'

export function getDisplayMode() {
  return displayMode
}

export function setDisplayMode(mode: DisplayMode) {
  const toolbar = document.querySelector('.fcitx-keyboard-toolbar') as HTMLElement
  const candidateBar = getCandidateBar()
  const returnBar = document.querySelector('.fcitx-keyboard-return-bar') as HTMLElement
  const keyboard = document.querySelector('.fcitx-keyboard') as HTMLElement
  const editor = document.querySelector('.fcitx-keyboard-editor') as HTMLElement
  const statusArea = getStatusArea()

  switch (mode) {
    case 'initial':
      show(toolbar)
      hide(candidateBar)
      hide(returnBar)
      show(keyboard)
      hide(editor)
      hide(statusArea)
      break
    case 'candidates':
      hide(toolbar)
      show(candidateBar)
      hide(returnBar)
      show(keyboard)
      hide(editor)
      hide(statusArea)
      break
    case 'edit':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hide(keyboard)
      show(editor)
      hide(statusArea)
      break
    case 'statusArea':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hide(keyboard)
      hide(editor)
      show(statusArea)
      break
  }
  displayMode = mode
}

export function setSvgStyle(container: HTMLElement, style: { [key: string]: string }) {
  const svg = container.querySelector('svg') as SVGElement
  for (const [k, v] of Object.entries(style)) {
    // @ts-expect-error too hard to annotate
    svg.style[k] = v
  }
}

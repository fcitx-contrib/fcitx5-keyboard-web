import type { NormalKey } from '../src/layout'
import type { VirtualKeyboardClient } from './api'

let client_: VirtualKeyboardClient

let pressedContainer: HTMLElement | null = null

export function setClient(client: VirtualKeyboardClient) {
  client_ = client
}

function getKeyContainer(target: EventTarget | null): HTMLElement | null {
  const ancestor = document.querySelector('.fcitx-keyboard')
  let el = target as HTMLElement | null
  while (el !== ancestor && el !== null) {
    if (el.classList.contains('fcitx-keyboard-key-container')) {
      return el
    }
    el = el.parentElement
  }
  return null
}

export function onTouchStart(event: TouchEvent) {
  pressedContainer = getKeyContainer(event.target)
  pressedContainer?.classList.add('fcitx-keyboard-pressed')
}

export function onTouchEnd() {
  const dataKey = pressedContainer?.getAttribute('data-key')
  if (dataKey) {
    const pressedKey = JSON.parse(dataKey) as NormalKey
    client_.sendEvent({ type: 'KEY_DOWN', data: { key: pressedKey.key ?? '', code: pressedKey.code ?? '' } })
  }
  pressedContainer?.classList.remove('fcitx-keyboard-pressed')
  pressedContainer = null
}

import type { NormalKey } from '../src/layout'
import type { VirtualKeyboardClient } from './api'

let client_: VirtualKeyboardClient

let pressedKey: NormalKey | null = null

export function setClient(client: VirtualKeyboardClient) {
  client_ = client
}

function getKey(target: EventTarget | null): NormalKey | null {
  const ancestor = document.querySelector('.fcitx-keyboard')
  let el = target as HTMLElement | null
  while (el !== ancestor && el !== null) {
    const dataKey = el.getAttribute('data-key')
    if (dataKey) {
      return JSON.parse(dataKey)
    }
    el = el.parentElement
  }
  return null
}

export function onTouchStart(event: TouchEvent) {
  pressedKey = getKey(event.target)
}

export function onTouchEnd() {
  if (pressedKey) {
    client_.sendEvent({ type: 'KEY_DOWN', data: { key: pressedKey.key ?? '', code: pressedKey.code ?? '' } })
    pressedKey = null
  }
}

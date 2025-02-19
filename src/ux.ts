import type { Key, Layout } from '../src/layout'
import type { VirtualKeyboardClient } from './api'
import { renderRow } from './key'

let layout_: Layout
let currentLayer = 'default'
let layerLocked = false

export function setLayout(layout: Layout) {
  layout_ = layout
}

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
    const pressedKey = JSON.parse(dataKey) as Key
    switch (pressedKey.type) {
      case 'key':
        client_.sendEvent({ type: 'KEY_DOWN', data: { key: pressedKey.key ?? '', code: pressedKey.code ?? '' } })
        if (!layerLocked) {
          setLayer('default', false)
        }
        break
      case 'shift':
        if (currentLayer === 'default') {
          setLayer('shift', false)
        }
        else {
          setLayer('default', false)
        }
        break
    }
  }
  pressedContainer?.classList.remove('fcitx-keyboard-pressed')
  pressedContainer = null
}

export function setLayer(id: string, locked: boolean) {
  for (const layer of layout_.layers) {
    if (layer.id === id) {
      currentLayer = id
      layerLocked = locked
      const keyboard = document.querySelector('.fcitx-keyboard') as HTMLElement
      keyboard.innerHTML = ''
      for (const row of layer.rows) {
        keyboard.appendChild(renderRow(row, {
          layer: id,
          locked,
        }))
      }
    }
  }
}

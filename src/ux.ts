import type { Key, Layout } from '../src/layout'
import type { VirtualKeyboardClient } from './api'
import Enter from 'bundle-text:../svg/enter.svg'
import { renderRow } from './key'
import { DATA_KEY } from './util'

let layout_: Layout
let currentLayer = 'default'
let layerLocked = false
let shiftReleaseTime = 0
let enterKeyType = ''

const DOUBLE_TAP_INTERVAL = 300 // Same with f5a.

export function setLayout(layout: Layout) {
  layout_ = layout
}

let client_: VirtualKeyboardClient

let previousContainer: HTMLElement | null = null
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
  // Don't change DOM here. It causes touchend not fired due to target removal.
  pressedContainer = getKeyContainer(event.target)
  if (pressedContainer?.classList.contains('fcitx-keyboard-pressed')) { // shift
    pressedContainer?.classList.remove('fcitx-keyboard-pressed')
  }
  else {
    pressedContainer?.classList.add('fcitx-keyboard-pressed')
  }
}

export function onTouchEnd() {
  const dataKey = pressedContainer?.getAttribute(DATA_KEY)
  if (dataKey) {
    const pressedKey = JSON.parse(dataKey) as Key
    switch (pressedKey.type) {
      case 'key':
        client_.sendEvent({ type: 'KEY_DOWN', data: { key: pressedKey.key ?? '', code: pressedKey.code ?? '' } })
        if (currentLayer === 'shift' && !layerLocked) {
          setLayer('default', false)
        }
        break
      case 'enter': {
        client_.sendEvent({ type: 'KEY_DOWN', data: { key: '\r', code: 'Enter' } })
        break
      }
      case 'backspace': {
        client_.sendEvent({ type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } })
        break
      }
      case 'shift': {
        const time = new Date().getTime()
        if (currentLayer === 'default') {
          setLayer('shift', false)
        }
        else {
          const previousDataKey = previousContainer?.getAttribute(DATA_KEY)
          const isDoubleTap = previousDataKey && (JSON.parse(previousDataKey) as Key).type === 'shift' && (time - shiftReleaseTime <= DOUBLE_TAP_INTERVAL)
          if (isDoubleTap) {
            setLayer('shift', true)
          }
          else {
            setLayer('default', false)
          }
        }
        shiftReleaseTime = time
        break
      }
    }
  }
  pressedContainer?.classList.remove('fcitx-keyboard-pressed')
  previousContainer = pressedContainer
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

export function getEnterKeyLabel() {
  if (enterKeyType) {
    return enterKeyType
  }
  return Enter
}

export function setEnterKeyType(label: string) {
  enterKeyType = label || Enter
  const enter = document.querySelector('.fcitx-keyboard-enter')
  if (!enter) {
    return
  }
  enter.innerHTML = label
}

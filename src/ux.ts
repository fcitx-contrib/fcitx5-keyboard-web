import type { Layout } from '../src/layout'
import type { VirtualKeyboardClient, VirtualKeyboardEvent } from './api'
import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import ArrowRight from 'bundle-text:../svg/arrow-right.svg'
import CheckMark from 'bundle-text:../svg/checkmark.svg'
import Enter from 'bundle-text:../svg/enter.svg'
import Search from 'bundle-text:../svg/search.svg'
import Send from 'bundle-text:../svg/send.svg'
import { setDisplayMode } from './display'
import { renderRow } from './key'
import { getContainer, getKey } from './util'

let layout_: Layout
let currentLayer = 'default'
let layerLocked = false
let shiftPressTime = 0
let shiftPressed = false
let shiftReleased = true
let keyPressedWithShiftPressed = false
let enterKeyType = ''
let spaceKeyLabel = ''
let pendingTouch: Touch | null = null
const touches: { [key: number]: Touch } = {}

const DOUBLE_TAP_INTERVAL = 300 // Same with f5a.

export function setLayout(layout: Layout) {
  layout_ = layout
}

let client_: VirtualKeyboardClient

export function setClient(client: VirtualKeyboardClient) {
  client_ = client
}

export function sendEvent(event: VirtualKeyboardEvent) {
  client_.sendEvent(event)
}

export function undo() {
  sendEvent({ type: 'UNDO' })
}

export function redo() {
  sendEvent({ type: 'REDO' })
}

export function sendKeyDown(key: string, code: string) {
  sendEvent({ type: 'KEY_DOWN', data: { key, code } })
}

export function backspace() {
  sendKeyDown('', 'Backspace')
}

export function selectCandidate(index: number) {
  sendEvent({ type: 'SELECT_CANDIDATE', data: index })
}

function touchDown(touch: Touch) {
  const container = getContainer(touch)
  const key = getKey(container)
  switch (key?.type) {
    case 'key': {
      sendKeyDown(key.key ?? '', key.code ?? '')
      if (shiftPressed) {
        keyPressedWithShiftPressed = true
      }
      else if (currentLayer === 'shift' && !layerLocked) {
        setLayer('default', false)
      }
      break
    }
    case 'enter': {
      sendKeyDown('\r', 'Enter')
      break
    }
    case 'space': {
      sendKeyDown(' ', 'Space')
      break
    }
    case 'backspace': {
      backspace()
      break
    }
    case 'shift': {
      shiftPressed = true
      keyPressedWithShiftPressed = false
      const time = new Date().getTime()
      if (currentLayer === 'default') {
        setLayer('shift', false)
      }
      else {
        const isDoubleTap = shiftReleased && time - shiftPressTime <= DOUBLE_TAP_INTERVAL
        if (isDoubleTap) {
          setLayer('shift', true)
        }
        else {
          setLayer('default', false)
        }
      }
      shiftPressTime = time
      break
    }
    case 'symbol':
      setDisplayMode('symbol')
      break
  }
}

function touchUp(touch: Touch) {
  const container = getContainer(touch)
  const key = getKey(container)
  if (key?.type === 'shift') {
    shiftPressed = false
    shiftReleased = true
    if (keyPressedWithShiftPressed) {
      setLayer('default', false)
    }
  }
  else {
    shiftReleased = false
  }
}

export function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  const key = getKey(getContainer(touch))
  if (key) {
    if (pendingTouch) {
      touchDown(pendingTouch)
    }
    if (key.type === 'shift') {
      touchDown(touch)
      pendingTouch = null
    }
    else {
      pendingTouch = touch
    }
  }
  // Must recalculate container as layer may have been changed.
  const container = getContainer(touch)
  container?.classList.add('fcitx-keyboard-pressed')
  touches[touch.identifier] = touch
}

export function onTouchEnd(event: TouchEvent) {
  const touchId = event.changedTouches[0].identifier
  const touch: Touch = touches[touchId]
  if (pendingTouch?.identifier === touch.identifier) {
    touchDown(touch)
    pendingTouch = null
  }
  touchUp(touch)
  const container = getContainer(touch)
  container?.classList.remove('fcitx-keyboard-pressed')
  delete touches[touchId]
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

export function getEnterKeyInnerHTML() {
  return {
    search: Search,
    send: Send,
    next: ArrowRight,
    done: CheckMark,
    previous: ArrowLeft,
  }[enterKeyType] || Enter
}

export function setEnterKeyType(label: string) {
  enterKeyType = label
  const enter = document.querySelector('.fcitx-keyboard-enter')
  if (!enter) {
    return
  }
  enter.innerHTML = getEnterKeyInnerHTML()
}

export function getSpaceKeyLabel() {
  return spaceKeyLabel
}

export function setSpaceKeyLabel(label: string) {
  spaceKeyLabel = label
  const space = document.querySelector('.fcitx-keyboard-space')
  if (space) {
    space.innerHTML = spaceKeyLabel
  }
}

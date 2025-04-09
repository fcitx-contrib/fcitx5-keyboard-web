import type { Key, Layout } from '../src/layout'
import type { VirtualKeyboardClient, VirtualKeyboardEvent } from './api'
import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import ArrowRight from 'bundle-text:../svg/arrow-right.svg'
import CheckMark from 'bundle-text:../svg/checkmark.svg'
import Enter from 'bundle-text:../svg/enter.svg'
import Search from 'bundle-text:../svg/search.svg'
import Send from 'bundle-text:../svg/send.svg'
import { setDisplayMode } from './display'
import { renderRow } from './key'
import { getContainer, getKey, press, release } from './util'

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
let startX = 0
let lastX = 0
// We assume only one key can slide at a time, and another touch suspends it.
let slidingKey: Key | null = null
let slid = false
let completedSteps = 0
const slideStep = 10

const DOUBLE_TAP_INTERVAL = 300 // Same with f5a.

export function setLayout(layout: Layout) {
  layout_ = layout
}

function resetSlide() {
  slidingKey = null
  slid = false
  completedSteps = 0
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
  startX = touch.clientX
  lastX = startX
  resetSlide()
  const key = getKey(getContainer(touch))
  if (key) {
    slidingKey = key
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
  container && press(container)
  touches[touch.identifier] = touch
}

export function onTouchMove(event: TouchEvent) {
  const touch = event.changedTouches[0]
  const { clientX } = touch
  if (['space', 'backspace'].includes(slidingKey?.type ?? '')) {
    if ((clientX - lastX) * (clientX - startX) < 0) { // turn around
      completedSteps = 0
      startX = lastX
    }
    const totalSteps = Math.floor(Math.abs((clientX - startX) / slideStep))
    let action: () => void
    if (slidingKey?.type === 'space') {
      const code = clientX > startX ? 'ArrowRight' : 'ArrowLeft'
      action = () => sendKeyDown('', code)
    }
    else {
      const data = clientX > startX ? 'RIGHT' : 'LEFT'
      action = () => sendEvent({ type: 'BACKSPACE_SLIDE', data })
    }
    while (completedSteps < totalSteps) {
      slid = true
      pendingTouch = null // Disable sending space on release.
      action()
      ++completedSteps
    }
  }
  lastX = clientX
}

export function onTouchEnd(event: TouchEvent) {
  if (slidingKey) {
    if (slidingKey.type === 'backspace' && slid) {
      sendEvent({ type: 'BACKSPACE_SLIDE', data: 'RELEASE' })
    }
    resetSlide()
  }
  const touchId = event.changedTouches[0].identifier
  const touch: Touch = touches[touchId]
  delete touches[touchId]
  const container = getContainer(touch)
  container && release(container)

  if (pendingTouch?.identifier === touch.identifier) {
    touchDown(touch)
    pendingTouch = null
  }
  touchUp(touch)
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

import type { Key, Layout } from '../src/layout'
import type { InputMethod, VirtualKeyboardClient, VirtualKeyboardEvent } from './api'
import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import ArrowRight from 'bundle-text:../svg/arrow-right.svg'
import CheckMark from 'bundle-text:../svg/checkmark.svg'
import Enter from 'bundle-text:../svg/enter.svg'
import Search from 'bundle-text:../svg/search.svg'
import Send from 'bundle-text:../svg/send.svg'
import { showContextmenu } from './contextmenu'
import { setDisplayMode } from './display'
import { renderRow } from './key'
import { getContainer, getKey, press, release } from './util'

type TouchState = 'HIT' | 'PRESSING' | 'MOVING' /* highlight in popover */ | 'SWIPING' | 'DOWN' | 'INTERRUPTED'

let layout_: Layout
let currentLayer = 'default'
let layerLocked = false
let shiftPressTime = 0
let shiftPressed = false
let shiftReleased = true
let keyPressedWithShiftPressed = false
let enterKeyType = ''
let spaceKeyLabel = ''
let inputMethods_: InputMethod[] = []
const touches: { [key: string]: {
  touch: Touch
  state: TouchState
  timer: number | null
  type: Key['type'] | undefined
  startX: number
  lastX: number
  completedSteps: number
} } = {}
const slideStep = 10

const DOUBLE_TAP_INTERVAL = 300 // Same with f5a.
const LONG_PRESS_THRESHOLD = 500
const DRAG_THRESHOLD = 10

function dragged(touch: Touch) {
  const { clientX: startX, clientY: startY } = touches[touch.identifier].touch
  const { clientX, clientY } = touch
  const dX = clientX - startX
  const dY = clientY - startY
  return dX * dX + dY * dY > DRAG_THRESHOLD
}

function cancelLongPress(touchId: number) {
  const { timer } = touches[touchId]
  if (timer) {
    clearTimeout(timer)
    touches[touchId].timer = null
  }
}

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
    case 'globe':
      sendEvent({ type: 'GLOBE' })
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

function interrupt(touchId: number) {
  for (const [id, { touch, state, timer }] of Object.entries(touches)) {
    if (Number(id) === touchId) {
      continue
    }
    switch (state) {
      case 'HIT':
        timer && cancelLongPress(timer)
        touchDown(touch)
        touches[id].state = 'DOWN'
        break
      case 'DOWN':
        break
      default:
        touches[id].state = 'INTERRUPTED'
    }
  }
}

function swipe(touch: Touch) {
  const { type } = touches[touch.identifier]
  const { clientX } = touch
  if (['space', 'backspace'].includes(type ?? '')) {
    if ((clientX - touches[touch.identifier].lastX) * (clientX - touches[touch.identifier].startX) < 0) { // turn around
      touches[touch.identifier].completedSteps = 0
      touches[touch.identifier].startX = touches[touch.identifier].lastX
    }
    const totalSteps = Math.floor(Math.abs((clientX - touches[touch.identifier].startX) / slideStep))
    let action: () => void
    if (type === 'space') {
      const code = clientX > touches[touch.identifier].startX ? 'ArrowRight' : 'ArrowLeft'
      action = () => sendKeyDown('', code)
    }
    else {
      const data = clientX > touches[touch.identifier].startX ? 'RIGHT' : 'LEFT'
      action = () => sendEvent({ type: 'BACKSPACE_SLIDE', data })
    }
    while (touches[touch.identifier].completedSteps < totalSteps) {
      action()
      ++touches[touch.identifier].completedSteps
    }
  }
  touches[touch.identifier].lastX = clientX
}

function longPress(touchId: number, container: HTMLElement) {
  touches[touchId].timer = null
  touches[touchId].state = 'PRESSING'
  showContextmenu(container, inputMethods_.map(inputMethod => ({
    text: inputMethod.displayName,
    callback() { sendEvent({ type: 'SET_INPUT_METHOD', data: inputMethod.name }) },
  })))
}

export function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  interrupt(touch.identifier)
  let container = getContainer(touch)
  const key = getKey(container)
  let timer: number | null = null
  let state: TouchState = 'HIT'
  if (key) {
    if (key.type === 'shift') {
      touchDown(touch)
      state = 'DOWN'
    }
    if (key.type === 'globe') {
      timer = window.setTimeout(longPress, LONG_PRESS_THRESHOLD, touch.identifier, container)
    }
  }
  // Must recalculate container as layer may have been changed.
  container = getContainer(touch)
  container && press(container)
  touches[touch.identifier] = {
    touch,
    state,
    timer,
    type: key?.type,
    startX: touch.clientX,
    lastX: touch.clientX,
    completedSteps: 0,
  }
}

export function onTouchMove(event: TouchEvent) {
  const touch = event.changedTouches[0]
  interrupt(touch.identifier)
  const { state } = touches[touch.identifier]
  switch (state) {
    case 'HIT':
      if (dragged(touch)) {
        cancelLongPress(touch.identifier)
        touches[touch.identifier].state = 'SWIPING'
        swipe(touch)
      }
      break
    case 'SWIPING':
      swipe(touch)
      break
  }
}

export function onTouchEnd(event: TouchEvent) {
  const touchId = event.changedTouches[0].identifier
  interrupt(touchId)
  cancelLongPress(touchId)
  const { touch, state, type } = touches[touchId]
  delete touches[touchId]
  const container = getContainer(touch)
  container && release(container)

  switch (state) {
    case 'HIT':
      touchDown(touch)
      // fall through
    case 'DOWN':
      touchUp(touch)
      break
    case 'SWIPING':
      if (type === 'backspace') {
        sendEvent({ type: 'BACKSPACE_SLIDE', data: 'RELEASE' })
      }
      break
  }
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
  const space = document.querySelector('.fcitx-keyboard-space') as HTMLElement | null
  if (space) {
    const invisible = document.querySelector('.fcitx-keyboard-invisible')!
    invisible.innerHTML = label
    const { width: invisibleWidth } = invisible.getBoundingClientRect() // This is achievable synchronously!
    invisible.innerHTML = ''
    const fontSize = space.getBoundingClientRect().width * 0.95 / invisibleWidth * 16
    space.style.fontSize = `min(${fontSize}px,40cqh)`
    space.innerHTML = spaceKeyLabel
  }
}

export function setInputMethods(inputMethods: InputMethod[], currentInputMethod: string) {
  inputMethods_ = inputMethods
  for (const inputMethod of inputMethods) {
    if (inputMethod.name === currentInputMethod) {
      setSpaceKeyLabel(inputMethod.displayName)
      break
    }
  }
}

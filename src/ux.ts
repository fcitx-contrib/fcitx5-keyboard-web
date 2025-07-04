import type { Action, Key, Layout, LongPress, Swipe } from '../src/layout'
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
import { hidePopover, showPopover, updateHighlight } from './popover'
import { getContainer, getKey, press, release } from './util'

type TouchState = 'HIT' | 'PRESSING' | 'SWIPING' | 'DOWN' | 'INTERRUPTED'

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
  longPress?: LongPress
  index: number
  type: Key['type'] | undefined
  swipeUp?: Swipe
  startX: number
  startY: number
  lastX: number
  completedSteps: number
} } = {}
const slideStep = 10

const DOUBLE_TAP_INTERVAL = 300 // Same with f5a.
export const LONG_PRESS_THRESHOLD = 300
export const DRAG_THRESHOLD = 10 // radius^2
const SWIPE_THRESHOLD = 10

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

function executeActions(actions: Action[]) {
  for (const action of actions) {
    switch (action.type) {
      case 'key':
        sendKeyDown(action.key ?? '', action.code ?? '')
        break
    }
  }
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
  for (const [id, { touch, state }] of Object.entries(touches)) {
    if (Number(id) === touchId) {
      continue
    }
    switch (state) {
      case 'HIT':
        cancelLongPress(Number(id))
        touchDown(touch)
        touches[id].state = 'DOWN'
        break
      case 'DOWN':
        break
      default:
        touches[id].state = 'INTERRUPTED'
        hidePopover()
    }
  }
}

function getSwipe(touch: Touch) {
  const { startY, swipeUp } = touches[touch.identifier]
  if (touch.clientY <= startY - SWIPE_THRESHOLD) {
    return swipeUp
  }
  return undefined
}

function horizontallyMove(touch: Touch, step: number, leftAction: () => void, rightAction: () => void) {
  const { clientX } = touch
  if ((clientX - touches[touch.identifier].lastX) * (clientX - touches[touch.identifier].startX) < 0) { // turn around
    touches[touch.identifier].completedSteps = 0
    touches[touch.identifier].startX = touches[touch.identifier].lastX
  }
  const action = touch.clientX > touches[touch.identifier].startX ? rightAction : leftAction
  const totalSteps = Math.floor(Math.abs((clientX - touches[touch.identifier].startX) / step))
  while (touches[touch.identifier].completedSteps < totalSteps) {
    action()
    ++touches[touch.identifier].completedSteps
  }
  touches[touch.identifier].lastX = clientX
}

function doSwipe(touch: Touch) {
  const { type } = touches[touch.identifier]
  if (['space', 'backspace'].includes(type ?? '')) {
    let leftAction: () => void
    let rightAction: () => void
    if (type === 'space') {
      leftAction = () => sendKeyDown('', 'ArrowLeft')
      rightAction = () => sendKeyDown('', 'ArrowRight')
    }
    else {
      leftAction = () => sendEvent({ type: 'BACKSPACE_SLIDE', data: 'LEFT' })
      rightAction = () => sendEvent({ type: 'BACKSPACE_SLIDE', data: 'RIGHT' })
    }
    horizontallyMove(touch, slideStep, leftAction, rightAction)
  }
  else {
    const swipe = getSwipe(touch)
    if (swipe) {
      showPopover(getContainer(touches[touch.identifier].touch)!, swipe.label)
    }
    else {
      hidePopover()
    }
  }
}

function swipeRelease(touch: Touch) {
  const swipeUp = getSwipe(touch)
  swipeUp && executeActions(swipeUp.actions)
  if (currentLayer === 'shift' && !layerLocked) {
    setLayer('default', false)
  }
}

function longPressHandler(touchId: number, container: HTMLElement) {
  touches[touchId].timer = null
  touches[touchId].state = 'PRESSING'
  if (touches[touchId].type === 'globe') {
    showContextmenu(container, inputMethods_.map(inputMethod => ({
      text: inputMethod.displayName,
      callback() { sendEvent({ type: 'SET_INPUT_METHOD', data: inputMethod.name }) },
    })))
  }
  else {
    const { touch, longPress } = touches[touchId]
    showPopover(getContainer(touch)!, longPress!)
  }
}

function moveHighlight(touch: Touch) {
  const action = (direction: 'LEFT' | 'RIGHT') => {
    const newIndex = updateHighlight(touches[touch.identifier].index, direction)
    touches[touch.identifier].index = newIndex
  }
  horizontallyMove(touch, getContainer(touches[touch.identifier].touch)!.getBoundingClientRect().width, () => action('LEFT'), () => action('RIGHT'))
}

function longPressRelease(touchId: number) {
  const { longPress, index } = touches[touchId]
  const actions = longPress?.cells[index].actions
  actions && executeActions(actions)
  if (currentLayer === 'shift' && !layerLocked) {
    setLayer('default', false)
  }
}

export function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  interrupt(touch.identifier)
  let container = getContainer(touch)
  const key = getKey(container)
  let swipeUp: Swipe | undefined
  let timer: number | null = null
  let longPress: LongPress | undefined
  let state: TouchState = 'HIT'
  if (key) {
    switch (key.type) {
      case 'shift':
        touchDown(touch)
        state = 'DOWN'
        break
      case 'globe':
        timer = window.setTimeout(longPressHandler, LONG_PRESS_THRESHOLD, touch.identifier, container)
        break
      case 'key':
        swipeUp = key.swipeUp
        if (key.longPress) {
          timer = window.setTimeout(longPressHandler, LONG_PRESS_THRESHOLD, touch.identifier, container)
          longPress = key.longPress
        }
        break
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
    swipeUp,
    longPress,
    index: longPress?.index ?? 0,
    startX: touch.clientX,
    startY: touch.clientY,
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
        doSwipe(touch)
      }
      break
    case 'SWIPING':
      doSwipe(touch)
      break
    case 'PRESSING':
      moveHighlight(touch)
      break
  }
}

export function onTouchEnd(event: TouchEvent) {
  const touchId = event.changedTouches[0].identifier
  interrupt(touchId)
  cancelLongPress(touchId)
  const { touch, state, type } = touches[touchId]
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
      hidePopover()
      switch (type) {
        case 'backspace':
          sendEvent({ type: 'BACKSPACE_SLIDE', data: 'RELEASE' })
          break
        case 'key':
          swipeRelease(event.changedTouches[0])
          break
      }
      break
    case 'PRESSING':
      hidePopover()
      longPressRelease(touchId)
      break
  }
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

export function setSpaceKeyLabel(space: HTMLElement | null, label: string) {
  spaceKeyLabel = label
  if (!space) {
    space = document.querySelector('.fcitx-keyboard-space') as HTMLElement | null
  }
  if (space) {
    const invisible = document.querySelector('.fcitx-keyboard-invisible')!
    invisible.innerHTML = label
    const { width: invisibleWidth } = invisible.getBoundingClientRect() // This is achievable synchronously!
    invisible.innerHTML = ''
    const fontSize = 95 * 16 / invisibleWidth
    space.style.fontSize = `min(${fontSize}cqw,40cqh)`
    space.innerHTML = spaceKeyLabel
  }
}

export function setInputMethods(inputMethods: InputMethod[], currentInputMethod: string) {
  inputMethods_ = inputMethods
  for (const inputMethod of inputMethods) {
    if (inputMethod.name === currentInputMethod) {
      setSpaceKeyLabel(null, inputMethod.displayName)
      break
    }
  }
}

import type { Action, Key, Layout, LongPress, Swipe } from '../src/layout'
import type { InputContextEvent, InputMethod, VirtualKeyboardClient, VirtualKeyboardEvent } from './api'
import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import ArrowRight from 'bundle-text:../svg/arrow-right.svg'
import CheckMark from 'bundle-text:../svg/checkmark.svg'
import Enter from 'bundle-text:../svg/enter.svg'
import Search from 'bundle-text:../svg/search.svg'
import Send from 'bundle-text:../svg/send.svg'
import { KEY_REPEAT_INTERVAL, LONG_PRESS_THRESHOLD } from './constant'
import { showContextmenu } from './contextmenu'
import { setDisplayMode } from './display'
import { renderRow } from './key'
import { observeKeyBackgrounds } from './keyBackground'
import { hidePopover, showKeyPreview, showPopover, updateHighlight } from './popover'
import { DATA_KEY, getContainer, getKey, isAndroidOrIOS, Pattern, press, release, vibrate } from './util'

type TouchState = 'HIT' | 'PRESSING' | 'SWIPING' | 'DOWN' | 'INTERRUPTED'

let layout_: Layout
let currentLayer = 'default'
let layerLocked = false
let shiftPressTime: number | null = null
let shiftPressed = false
let shiftReleased = true
let keyPressedWithShiftPressed = false
let enterKeyType = ''
let spaceKeyLabel = ''
let inputMethods_: InputMethod[] = []
const touches: { [key: string]: {
  touch: Touch
  container?: Element
  state: TouchState
  timer: number | null
  longPress?: LongPress
  index: number
  type: Key['type'] | undefined
  swipeUp?: Swipe
  startX: number
  startY: number
  lastX: number
  slideActivated: boolean
} } = {}
const SLIDE_STEP = 15 // CSS px; iOS uses 15pt.
const LONG_PRESS_STEP = 30 // CSS px; iOS uses 30pt per menu item.

const DOUBLE_TAP_INTERVAL = 300 // iOS recognizes intervals strictly below 300ms.
export const DRAG_THRESHOLD_SQUARED = 10 // CSS px squared
const SWIPE_THRESHOLD = 30 // CSS px; iOS uses 30pt.
const numpadSwipe: Swipe = { label: '123', actions: [] }
const numpadLongPress: LongPress = {
  cells: [numpadSwipe],
  index: 0,
}

function dragged(touch: Touch) {
  const { touch: initialTouch, type } = touches[touch.identifier]
  const { clientX: startX, clientY: startY } = initialTouch
  const { clientX, clientY } = touch
  const dX = clientX - startX
  const dY = clientY - startY
  // Match iOS: keep taps and pending menus until either axis exceeds 30.
  if (type === 'key' || type === 'symbol' || type === 'globe' || type === 'enter') {
    return Math.max(Math.abs(dX), Math.abs(dY)) > SWIPE_THRESHOLD
  }
  return dX * dX + dY * dY > DRAG_THRESHOLD_SQUARED
}

function cancelLongPress(touchId: number) {
  const { timer } = touches[touchId]
  if (timer) {
    clearTimeout(timer)
    touches[touchId].timer = null
  }
}

export function cancelPendingTouches() {
  for (const [id, { touch }] of Object.entries(touches)) {
    cancelLongPress(Number(id))
    const container = getTouchContainer(touch)
    container && release(container)
    touches[id].state = 'INTERRUPTED'
  }
  hidePopover()
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
  sendEvent({
    type: 'KEY_DOWN',
    data: { key, code },
  })
}

export function backspace() {
  sendKeyDown('', 'Backspace')
}

export function handleBackspace(element: HTMLElement) {
  element.setAttribute(DATA_KEY, JSON.stringify({ type: 'backspace' }))
  element.addEventListener('touchstart', (event) => {
    // Suppress the compatibility click so a tap only deletes once.
    event.preventDefault()
    onTouchStart(event, element)
  })
  element.addEventListener('touchmove', onTouchMove)
  element.addEventListener('touchend', onTouchEnd)
  element.addEventListener('touchcancel', onTouchEnd)
  if (!isAndroidOrIOS) {
    element.addEventListener('click', backspace)
  }
}

function getTouchContainer(touch: Touch) {
  return touches[touch.identifier]?.container ?? getContainer(touch)
}

export function selectCandidate(context: InputContextEvent, index: number) {
  sendEvent({
    type: 'SELECT_CANDIDATE',
    data: { ...context, index },
  })
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

function resetShiftLayer() {
  if (currentLayer === 'shift' && !layerLocked && !shiftPressed) {
    setLayer('default', false)
  }
}

function touchDown(touch: Touch) {
  const container = getTouchContainer(touch)
  const key = getKey(container)
  switch (key?.type) {
    case 'key': {
      if (key.commit) {
        sendEvent({ type: 'COMMIT', data: key.key ?? '' })
      }
      else {
        sendKeyDown(key.key ?? '', key.code ?? '')
      }
      resetShiftLayer()
      break
    }
    case 'enter': {
      sendKeyDown('\r', 'Enter')
      break
    }
    case 'space': {
      if (key.commit) {
        sendEvent({ type: 'COMMIT', data: ' ' })
        resetShiftLayer()
      }
      else {
        sendKeyDown(' ', 'Space')
      }
      break
    }
    case 'backspace': {
      backspace()
      break
    }
    case 'shift': {
      shiftPressed = true
      keyPressedWithShiftPressed = false
      const time = Date.now()
      const isDoubleTap = shiftReleased && shiftPressTime !== null && time - shiftPressTime < DOUBLE_TAP_INTERVAL
      // Consume the pair like iOS: the third press is a new single tap, not
      // another double tap. A fourth press can complete the next pair.
      shiftPressTime = isDoubleTap ? null : time
      if (isDoubleTap) {
        setLayer('shift', true)
      }
      else if (currentLayer === 'default') {
        setLayer('shift', false)
      }
      else {
        setLayer('default', false)
      }
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
  const container = getTouchContainer(touch)
  const key = getKey(container)
  if (key?.type === 'shift') {
    shiftPressed = false
    shiftReleased = true
    if (keyPressedWithShiftPressed && !layerLocked) {
      setLayer('default', false)
    }
  }
  else {
    shiftReleased = false
  }
}

function isSlideKey(type: Key['type'] | undefined) {
  return type === 'space' || type === 'backspace'
}

function interrupt(touchIds: readonly number[]) {
  for (const [id, { touch, state, type }] of Object.entries(touches)) {
    // Touches in the same event must not interrupt each other. Space/backspace
    // always belong to their own touch until release, like iOS.
    if (touchIds.includes(Number(id)) || isSlideKey(type)) {
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
        cancelLongPress(Number(id))
        touches[id].state = 'INTERRUPTED'
        hidePopover()
    }
  }
}

export function onTouchInterrupt(event: TouchEvent) {
  // The mask has already handled these starts before they bubble here.
  interrupt(Array.from(event.changedTouches, touch => touch.identifier))
}

function getSwipe(touch: Touch) {
  const { startX, startY, swipeUp } = touches[touch.identifier]
  const dX = touch.clientX - startX
  const dY = touch.clientY - startY
  // Called after entering SWIPING. Like iOS, use the current total direction,
  // favor vertical on ties, and do not reapply the activation threshold.
  if (dY <= 0 && Math.abs(dY) >= Math.abs(dX)) {
    return swipeUp
  }
  return undefined
}

function slide(touch: Touch) {
  const gesture = touches[touch.identifier]
  const { startX, startY, state, type } = gesture
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  if (!gesture.slideActivated) {
    if (Math.abs(dx) < SWIPE_THRESHOLD) {
      // Before long press, large movement cancels the tap/repeat, but a later
      // horizontal move can still activate sliding. After long press, ignore dy.
      if (state === 'HIT' && Math.max(Math.abs(dx), Math.abs(dy)) > SWIPE_THRESHOLD) {
        cancelLongPress(touch.identifier)
        gesture.state = 'SWIPING'
      }
      return
    }
    gesture.slideActivated = true
    gesture.state = 'SWIPING'
    cancelLongPress(touch.identifier)
    // Consume the initial 30px once; keep this original grid when reversing.
    gesture.lastX = startX + Math.sign(dx) * SWIPE_THRESHOLD
  }
  const stepAt = (x: number) => Math.sign(x - startX) * Math.floor(Math.abs(x - startX) / SLIDE_STEP)
  const steps = stepAt(touch.clientX) - stepAt(gesture.lastX)
  gesture.lastX = touch.clientX
  for (let i = 0; i < Math.abs(steps); ++i) {
    // sendEvent can synchronously cancel this gesture or replace its surface.
    if (touches[touch.identifier] !== gesture || gesture.state !== 'SWIPING') {
      break
    }
    if (type === 'space') {
      sendKeyDown('', steps < 0
        ? 'ArrowLeft'
        : 'ArrowRight')
    }
    else {
      sendEvent({
        type: 'BACKSPACE_SLIDE',
        data: steps < 0
          ? 'LEFT'
          : 'RIGHT',
      })
    }
  }
}

function doSwipe(touch: Touch) {
  const { type } = touches[touch.identifier]
  const swipe = getSwipe(touch)
  if (swipe) {
    showPopover(
      getContainer(touches[touch.identifier].touch)!,
      type === 'symbol'
        ? numpadLongPress
        : swipe.label,
    )
  }
  else {
    hidePopover()
  }
}

function swipeRelease(touch: Touch) {
  const { type } = touches[touch.identifier]
  const swipeUp = getSwipe(touch)
  if (type === 'symbol' && swipeUp) {
    setDisplayMode('numpad')
  }
  else {
    swipeUp && executeActions(swipeUp.actions)
  }
  resetShiftLayer()
}

function longPressHandler(touchId: number, container: HTMLElement) {
  const gesture = touches[touchId]
  if (!gesture || gesture.state !== 'HIT') {
    return
  }
  vibrate(container, Pattern.Long)
  gesture.timer = null
  gesture.state = 'PRESSING'
  if (gesture.type === 'backspace') {
    gesture.timer = window.setInterval(() => {
      // Reject a queued repeat after sliding, release, or identifier reuse.
      if (touches[touchId] === gesture && gesture.state === 'PRESSING') {
        backspace()
      }
    }, KEY_REPEAT_INTERVAL)
  }
  else if (gesture.type === 'globe') {
    showContextmenu(container, inputMethods_.map(inputMethod => ({
      text: inputMethod.displayName,
      callback() { sendEvent({ type: 'SET_INPUT_METHOD', data: inputMethod.name }) },
    })))
  }
  else if (gesture.type !== 'space') {
    // Space enters long-press state on iOS, but has no menu/action to show.
    const { touch, longPress } = gesture
    showPopover(getContainer(touch)!, longPress!)
  }
}

function moveHighlight(touch: Touch) {
  const gesture = touches[touch.identifier]
  if ((gesture.longPress?.cells.length ?? 0) < 2) {
    return
  }
  const steps = Math.trunc((touch.clientX - gesture.lastX) / LONG_PRESS_STEP)
  // Keep the fractional remainder and consume whole steps even at a menu edge.
  // Unlike space/backspace, menu selection is relative to the last consumed step.
  gesture.lastX += steps * LONG_PRESS_STEP
  for (let i = 0; i < Math.abs(steps); ++i) {
    gesture.index = updateHighlight(gesture.index, steps < 0
      ? 'LEFT'
      : 'RIGHT')
  }
}

function longPressRelease(touchId: number) {
  const { longPress, index, type } = touches[touchId]
  if (type === 'symbol') {
    setDisplayMode('numpad')
  }
  else {
    const cell = longPress?.cells[index]
    if (cell?.type === 'unicode') {
      sendEvent({ type: 'UNICODE' })
    }
    else if (cell?.type === 'quickphrase') {
      sendEvent({ type: 'QUICKPHRASE' })
    }
    else if (cell?.actions) {
      executeActions(cell.actions)
    }
  }
  resetShiftLayer()
}

export function onTouchStart(event: TouchEvent, touchContainer?: Element) {
  for (const touch of Array.from(event.changedTouches)) {
    startTouch(touch, touchContainer)
  }
}

function startTouch(touch: Touch, touchContainer?: Element) {
  // New presses still flush preceding ordinary keys in start order, including
  // earlier starts in this batch. The bubbling handler must not flush the last.
  interrupt([touch.identifier])
  hidePopover()
  let container = touchContainer ?? getContainer(touch)
  const key = getKey(container)
  let swipeUp: Swipe | undefined
  let timer: number | null = null
  let longPress: LongPress | undefined
  let state: TouchState = 'HIT'
  if (key) {
    // Break the pending pair at key acceptance, even if this touch stays held.
    // Clearing the timestamp also survives a later release of a held Shift.
    if (key.type !== 'shift') {
      shiftPressTime = null
    }
    vibrate()
    switch (key.type) {
      case 'shift':
        touchDown(touch)
        state = 'DOWN'
        break
      case 'space':
      case 'backspace':
      case 'globe':
        timer = window.setTimeout(longPressHandler, LONG_PRESS_THRESHOLD, touch.identifier, container)
        break
      case 'key':
        // Count accepted keys even when they end in a swipe, menu or no output.
        if (shiftPressed) {
          keyPressedWithShiftPressed = true
        }
        swipeUp = key.swipeUp
        if (key.longPress) {
          timer = window.setTimeout(longPressHandler, LONG_PRESS_THRESHOLD, touch.identifier, container)
          longPress = key.longPress
        }
        break
      case 'symbol':
        swipeUp = numpadSwipe
        longPress = numpadLongPress
        timer = window.setTimeout(longPressHandler, LONG_PRESS_THRESHOLD, touch.identifier, container)
        break
    }
  }
  // Must recalculate container as layer may have been changed.
  container = touchContainer ?? getContainer(touch)
  container && press(container)
  if (container && key?.type === 'key') {
    showKeyPreview(container, key.label)
  }
  touches[touch.identifier] = {
    touch,
    container: touchContainer,
    state,
    timer,
    type: key?.type,
    swipeUp,
    longPress,
    index: longPress?.index ?? 0,
    startX: touch.clientX,
    startY: touch.clientY,
    lastX: touch.clientX,
    slideActivated: false,
  }
}

export function onTouchMove(event: TouchEvent) {
  const changedTouches = Array.from(event.changedTouches)
  const touchIds = changedTouches.map(touch => touch.identifier)
  for (const touch of changedTouches) {
    moveTouch(touch, touchIds)
  }
}

function moveTouch(touch: Touch, touchIds: readonly number[]) {
  const gesture = touches[touch.identifier]
  if (!gesture) {
    return
  }
  const { state, type } = gesture
  if (isSlideKey(type)) {
    if (state !== 'DOWN' && state !== 'INTERRUPTED') {
      slide(touch)
    }
    return
  }
  interrupt(touchIds)
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
      if (touches[touch.identifier].type !== 'backspace') {
        moveHighlight(touch)
      }
      break
  }
}

export function onTouchEnd(event: TouchEvent) {
  const changedTouches = Array.from(event.changedTouches)
  const touchIds = changedTouches.map(touch => touch.identifier)
  const shiftTouches: Touch[] = []
  for (const changed of changedTouches) {
    // Pending keys in this batch must commit before Shift resets their layer.
    // Keep the original order of all other endings and exclude the full batch.
    if (touches[changed.identifier]?.type === 'shift') {
      shiftTouches.push(changed)
      continue
    }
    endTouch(changed, touchIds)
  }
  for (const changed of shiftTouches) {
    endTouch(changed, touchIds)
  }
}

function endTouch(changed: Touch, touchIds: readonly number[]) {
  const touchId = changed.identifier
  const gesture = touches[touchId]
  if (!gesture) {
    return
  }
  const { touch, state, type, slideActivated } = gesture
  if (!isSlideKey(type)) {
    interrupt(touchIds)
  }
  cancelLongPress(touchId)
  // Retire before calling the host: release/key callbacks can reenter this handler.
  gesture.state = 'INTERRUPTED'
  const container = getTouchContainer(touch)
  container && release(container)
  hidePopover()

  switch (state) {
    case 'HIT':
      touchDown(touch)
      // fall through
    case 'DOWN':
      touchUp(touch)
      break
    case 'SWIPING':
      switch (type) {
        case 'backspace':
          if (slideActivated) {
            sendEvent({ type: 'BACKSPACE_SLIDE', data: 'RELEASE' })
          }
          break
        case 'key':
        case 'symbol':
          swipeRelease(changed)
          break
      }
      break
    case 'PRESSING':
      if (!isSlideKey(type)) {
        longPressRelease(touchId)
      }
      break
  }
  if (touches[touchId] === gesture) {
    delete touches[touchId]
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
      observeKeyBackgrounds(keyboard.closest('.fcitx-keyboard-container')!)
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
  for (const enter of document.querySelectorAll('.fcitx-keyboard-enter, .fcitx-keyboard-numpad-enter')) {
    enter.innerHTML = getEnterKeyInnerHTML()
  }
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
    invisible.textContent = label
    const { width: invisibleWidth } = invisible.getBoundingClientRect() // This is achievable synchronously!
    invisible.innerHTML = ''
    const fontSize = 95 * 16 / invisibleWidth
    space.style.fontSize = `min(${fontSize}cqw,40cqh)`
    space.textContent = spaceKeyLabel
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

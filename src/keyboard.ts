import type { SystemEvent } from './api'
import type { BUILTIN_LAYOUT, Layout } from './layout'
import presetCss from 'bundle-text:./preset.css'
import qwerty from '../fcitx5-keyboard-layouts/layout/qwerty.json'
import { renderCandidateBar, setCandidateActions, setCandidates, setPreedit } from './candidates'
import { hideContextMenu, renderContextmenu } from './contextmenu'
import { removeCandidatesFromStack, setDisplayMode } from './display'
import { deselect, renderEditor, select } from './editor'
import { renderPopover } from './popover'
import { renderReturnBar } from './return'
import { renderStatusArea, setStatusArea } from './statusArea'
import { renderSymbolSelector } from './symbol'
import { enableRedo, enableUndo, renderToolbar } from './toolbar'
import { div, hide, isAndroidOrIOS, isFirefox } from './util'
import { onTouchEnd, onTouchMove, onTouchStart, setEnterKeyType, setInputMethods, setLayer, setLayout as setLayout_ } from './ux'

const builtInLayoutMap = { qwerty } as { [key: string]: Layout }

export function setLayout(id: string, layout: Layout) {
  setLayout_(layout)

  const style = document.createElement('style')
  style.textContent = presetCss

  const toolbar = renderToolbar()
  const candidateBar = renderCandidateBar()
  const returnBar = renderReturnBar()

  const keyboard = div('fcitx-keyboard')
  keyboard.classList.add('fcitx-keyboard-frame')

  // Use a mask layer above the keyboard to handle all events, otherwise
  // layer change will destroy event target thus make touchend not fired.
  const mask = div('fcitx-keyboard-mask')
  mask.classList.add('fcitx-keyboard-frame')
  mask.addEventListener('touchstart', onTouchStart)
  mask.addEventListener('touchmove', onTouchMove)
  mask.addEventListener('touchend', onTouchEnd)
  mask.addEventListener('touchcancel', onTouchEnd)

  const editor = renderEditor()
  editor.classList.add('fcitx-keyboard-frame')

  const statusArea = renderStatusArea()
  statusArea.classList.add('fcitx-keyboard-frame')

  const symbol = renderSymbolSelector()
  symbol.classList.add('fcitx-keyboard-frame')

  const contextmenu = renderContextmenu()
  hide(contextmenu)

  const popover = renderPopover()
  hide(popover)

  const invisible = div('fcitx-keyboard-invisible')

  const container = div('fcitx-keyboard-container')
  for (const element of [
    style,
    toolbar,
    candidateBar,
    returnBar,
    keyboard,
    mask,
    editor,
    statusArea,
    symbol,
    contextmenu,
    popover,
    invisible,
  ]) {
    container.appendChild(element)
  }
  if (isAndroidOrIOS) {
    // Disable iOS Safari select text.
    // Ideally Android doesn't need this, but default behavior of touchstart will cause input blur.
    // Can't be solved by refocus on blur, as it must be async, which may be after another touchstart.
    container.addEventListener('touchstart', e => e.preventDefault())
    // Don't let context menu click trigger blur event.
    container.addEventListener('touchend', e => e.preventDefault())
  }

  const app = document.getElementById(id)!
  app.innerHTML = ''
  app.appendChild(container)
  setDisplayMode('initial')
  if (isFirefox) {
    // Firefox is buggy if render synchronously.
    setTimeout(() => {
      setLayer('default', false)
    }, 0)
  }
  else {
    setLayer('default', false)
  }
}

export function setBuiltInLayout(id: string, name: BUILTIN_LAYOUT) {
  setLayout(id, builtInLayoutMap[name])
}

export function onMessage(message: string) {
  const event = JSON.parse(message) as SystemEvent
  switch (event.type) {
    case 'ENTER_KEY_TYPE':
      setEnterKeyType(event.data)
      break
    case 'HIDE':
      setLayer('default', false)
    // fall through
    case 'CLEAR':
      hideContextMenu()
      removeCandidatesFromStack()
      break
    case 'PREEDIT':
      setPreedit(event.data.auxUp, event.data.preedit, event.data.caret)
      break
    case 'CANDIDATES':
      setCandidates(event.data.candidates, event.data.highlighted, event.data.scrollState, event.data.scrollStart, event.data.scrollEnd)
      break
    case 'CANDIDATE_ACTIONS':
      setCandidateActions(event.data.index, event.data.actions)
      break
    case 'STATUS_AREA':
      setStatusArea(event.data)
      break
    case 'INPUT_METHODS':
      setInputMethods(event.data.inputMethods, event.data.currentInputMethod)
      break
    case 'SELECT':
      return select()
    case 'DESELECT':
      return deselect()
    case 'UNDO':
      return enableUndo(event.data)
    case 'REDO':
      return enableRedo(event.data)
  }
}

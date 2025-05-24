import type { SystemEvent } from './api'
import type { BUILTIN_LAYOUT, Layout } from './layout'
import presetCss from 'bundle-text:./preset.css'
import qwerty from '../fcitx5-keyboard-layouts/layout/qwerty.json'
import { renderCandidateBar, setCandidateActions, setCandidates, setPreedit } from './candidates'
import { hideContextMenu, renderContextmenu } from './contextmenu'
import { removeCandidatesFromStack, setDisplayMode } from './display'
import { deselect, renderEditor, select } from './editor'
import { renderRow } from './key'
import { renderPopover } from './popover'
import { renderReturnBar } from './return'
import { renderStatusArea, setStatusArea } from './statusArea'
import { renderSymbolSelector } from './symbol'
import { enableRedo, enableUndo, renderToolbar } from './toolbar'
import { div, hide, isIOS } from './util'
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
  for (const layer of layout.layers) {
    if (layer.id === 'default') {
      for (const row of layer.rows) {
        keyboard.appendChild(renderRow(row, {
          layer: layer.id,
          locked: false,
        }))
      }
      break
    }
  }

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
  if (isIOS()) {
    // Disable iOS Safari select text.
    container.addEventListener('touchstart', e => e.preventDefault())
  }

  const app = document.getElementById(id)!
  app.innerHTML = ''
  app.appendChild(container)
  setDisplayMode('initial')
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
      setPreedit(event.data.auxUp, event.data.preedit)
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

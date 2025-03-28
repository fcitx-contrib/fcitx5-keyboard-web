import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import Clipboard from 'bundle-text:../svg/clipboard.svg'
import CursorMove from 'bundle-text:../svg/cursor-move.svg'
import Ellipsis from 'bundle-text:../svg/ellipsis.svg'
import Undo from 'bundle-text:../svg/undo.svg'
import { setDisplayMode } from './display'
import { disable, div, enable, renderToolbarButton, setSvgStyle } from './util'
import { redo, sendEvent, undo } from './ux'

let isUndoEnabled: boolean = false
let isRedoEnabled: boolean = false
let undoButton: HTMLElement | null = null
let redoButton: HTMLElement | null = null

export function enableUndo(enabled: boolean) {
  isUndoEnabled = enabled
  if (undoButton)
    enabled ? enable(undoButton) : disable(undoButton)
}

export function enableRedo(enabled: boolean) {
  isRedoEnabled = enabled
  if (redoButton)
    enabled ? enable(redoButton) : disable(redoButton)
}

function renderDisableButton(icon: string, enabled: () => boolean) {
  const button = div('fcitx-keyboard-toolbar-button')
  button.innerHTML = icon
  const touchStart = () => {
    if (!enabled())
      return
    button.classList.add('fcitx-keyboard-pressed')
  }
  const touchEnd = () => {
    if (!enabled())
      return
    button.classList.remove('fcitx-keyboard-pressed')
  }
  button.addEventListener('touchstart', touchStart)
  button.addEventListener('touchend', touchEnd)
  button.addEventListener('touchcancel', touchEnd)
  return button
}

function renderUndoButton() {
  return renderDisableButton(Undo, () => isUndoEnabled)
}

function renderRedoButton() {
  return renderDisableButton(Undo, () => isRedoEnabled)
}

export function renderToolbar() {
  const toolbar = div('fcitx-keyboard-toolbar')

  undoButton = renderUndoButton()
  enableUndo(isUndoEnabled)
  // No fancy gesture so just use click.
  undoButton.addEventListener('click', () => {
    if (!isUndoEnabled)
      return
    undo()
  })

  redoButton = renderRedoButton()
  enableRedo(isRedoEnabled)
  redoButton.style.transform = 'scaleX(-1)'
  redoButton.addEventListener('click', () => {
    if (!isRedoEnabled)
      return
    redo()
  })

  const editButton = renderToolbarButton(CursorMove)
  editButton.addEventListener('click', () => setDisplayMode('edit'))

  const clipboardButton = renderToolbarButton(Clipboard)

  const statusAreaButton = renderToolbarButton(Ellipsis)
  statusAreaButton.addEventListener('click', () => setDisplayMode('statusArea'))

  const collapseButton = renderToolbarButton(ChevronLeft)
  collapseButton.addEventListener('click', () => sendEvent({ type: 'COLLAPSE' }))
  setSvgStyle(collapseButton, { transform: 'rotate(270deg)' })

  for (const button of [undoButton, redoButton, editButton, clipboardButton, statusAreaButton, collapseButton]) {
    toolbar.appendChild(button)
  }
  return toolbar
}

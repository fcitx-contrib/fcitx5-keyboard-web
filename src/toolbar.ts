import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import Clipboard from 'bundle-text:../svg/clipboard.svg'
import CursorMove from 'bundle-text:../svg/cursor-move.svg'
import Ellipsis from 'bundle-text:../svg/ellipsis.svg'
import Undo from 'bundle-text:../svg/undo.svg'
import { setDisplayMode } from './display'
import { div, renderToolbarButton, setSvgStyle } from './util'
import { redo, sendEvent, undo } from './ux'

export function renderToolbar() {
  const toolbar = div('fcitx-keyboard-toolbar')

  const undoButton = renderToolbarButton(Undo)
  // No fancy gesture so just use click.
  undoButton.addEventListener('click', undo)

  const redoButton = renderToolbarButton(Undo)
  redoButton.style.transform = 'scaleX(-1)'
  redoButton.addEventListener('click', redo)

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

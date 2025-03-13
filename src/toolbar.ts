import CursorMove from 'bundle-text:../svg/cursor-move.svg'
import Undo from 'bundle-text:../svg/undo.svg'
import { div, renderToolbarButton, setDisplayMode } from './util'
import { redo, undo } from './ux'

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

  for (const button of [undoButton, redoButton, editButton]) {
    toolbar.appendChild(button)
  }
  return toolbar
}

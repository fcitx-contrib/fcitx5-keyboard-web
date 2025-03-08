import Undo from 'bundle-text:../svg/undo.svg'
import { div } from './util'
import { redo, undo } from './ux'

export function renderToolbar() {
  const toolbar = div('fcitx-keyboard-toolbar')

  const undoButton = div('fcitx-keyboard-toolbar-button')
  undoButton.innerHTML = Undo
  // No fancy gesture so just use click.
  undoButton.addEventListener('click', undo)

  const redoButton = div('fcitx-keyboard-toolbar-button')
  redoButton.innerHTML = Undo
  redoButton.style.transform = 'scaleX(-1)'
  redoButton.addEventListener('click', redo)

  for (const button of [undoButton, redoButton]) {
    button.addEventListener('touchstart', () => {
      button.classList.add('fcitx-keyboard-pressed')
    })
    button.addEventListener('touchend', () => {
      button.classList.remove('fcitx-keyboard-pressed')
    })
    toolbar.appendChild(button)
  }
  return toolbar
}

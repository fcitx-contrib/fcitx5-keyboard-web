import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import Backspace from 'bundle-text:../svg/backspace.svg'
import { popDisplayMode } from './display'
import { div, handleClick, renderToolbarButton } from './util'
import { handleBackspace } from './ux'

export function renderReturnBar() {
  const returnBar = div('fcitx-keyboard-return-bar')
  const returnButton = renderToolbarButton(ArrowLeft)
  handleClick(returnButton, () => {
    popDisplayMode()
  })
  const backspace = div('fcitx-keyboard-return-backspace')
  const backspaceButton = div('fcitx-keyboard-key')
  backspaceButton.classList.add('fcitx-keyboard-backspace')
  backspaceButton.innerHTML = Backspace
  backspace.appendChild(backspaceButton)
  handleBackspace(backspace)
  returnBar.append(returnButton, backspace)
  return returnBar
}

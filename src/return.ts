import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import { popDisplayModeStack } from './display'
import { div, handleClick, renderToolbarButton } from './util'

export function renderReturnBar() {
  const returnBar = div('fcitx-keyboard-return-bar')
  const returnButton = renderToolbarButton(ArrowLeft)
  handleClick(returnButton, () => {
    popDisplayModeStack()
  })
  returnBar.appendChild(returnButton)
  return returnBar
}

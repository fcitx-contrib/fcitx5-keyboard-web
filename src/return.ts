import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import { popDisplayModeStack } from './display'
import { div, renderToolbarButton } from './util'

export function renderReturnBar() {
  const returnBar = div('fcitx-keyboard-return-bar')
  const returnButton = renderToolbarButton(ArrowLeft)
  returnButton.addEventListener('click', () => {
    popDisplayModeStack()
  })
  returnBar.appendChild(returnButton)
  return returnBar
}

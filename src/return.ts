import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import { div, renderToolbarButton, setDisplayMode } from './util'

export function renderReturnBar() {
  const returnBar = div('fcitx-keyboard-return-bar')
  const returnButton = renderToolbarButton(ArrowLeft)
  returnButton.addEventListener('click', () => {
    setDisplayMode('initial')
  })
  returnBar.appendChild(returnButton)
  return returnBar
}

import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import Backspace from 'bundle-text:../svg/backspace.svg'
import Lock from 'bundle-text:../svg/lock.svg'
import Unlock from 'bundle-text:../svg/unlock.svg'
import { popDisplayMode } from './display'
import { isSymbolLocked, toggleSymbolLock } from './symbolState'
import { div, handleClick, renderToolbarButton } from './util'
import { handleBackspace } from './ux'

export function renderReturnBar() {
  const returnBar = div('fcitx-keyboard-return-bar')
  const returnButton = renderToolbarButton(ArrowLeft)
  returnButton.classList.add('fcitx-keyboard-return-button')
  handleClick(returnButton, () => {
    popDisplayMode()
  })
  const lockButton = renderToolbarButton('')
  lockButton.classList.add('fcitx-keyboard-symbol-lock')
  const updateLockButton = () => {
    const locked = isSymbolLocked()
    lockButton.innerHTML = locked ? Lock : Unlock
    lockButton.setAttribute('aria-pressed', locked.toString())
  }
  updateLockButton()
  handleClick(lockButton, () => {
    toggleSymbolLock()
    updateLockButton()
  })
  const backspace = div('fcitx-keyboard-return-backspace')
  const backspaceButton = div('fcitx-keyboard-key')
  backspaceButton.classList.add('fcitx-keyboard-backspace')
  backspaceButton.innerHTML = Backspace
  backspace.appendChild(backspaceButton)
  handleBackspace(backspace)
  returnBar.append(returnButton, lockButton, backspace)
  return returnBar
}

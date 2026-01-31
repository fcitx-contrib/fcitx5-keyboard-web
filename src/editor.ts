import Backspace from 'bundle-text:../svg/backspace.svg'
import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import FirstPage from 'bundle-text:../svg/first-page.svg'
import { div, handleClick, press, release, setSvgStyle } from './util'
import { backspace, sendEvent, sendKeyDown } from './ux'

let selecting = false
let selectButton: HTMLElement
let selectAllOrCutButton: HTMLElement

function adjustSelectAllOrCut() {
  const button = selectAllOrCutButton?.querySelector('.fcitx-keyboard-editor-button')
  if (!button) {
    return
  }
  // Harmony doesn't have a way to report whether selection is empty, so can't be used to decide button state.
  button.textContent = selecting ? 'Cut' : 'Select all'
}

export function select() {
  selecting = true
  press(selectButton)
  adjustSelectAllOrCut()
}

export function deselect() {
  selecting = false
  release(selectButton)
  adjustSelectAllOrCut()
}

function renderEditorButton(label: string, gridArea: string) {
  const container = div('fcitx-keyboard-editor-button-container')
  const button = div('fcitx-keyboard-editor-button')
  const isFunctional = Number(gridArea.split(' / ')[1]) === 7
  button.classList.add(isFunctional ? 'fcitx-keyboard-editor-function' : 'fcitx-keyboard-editor-cursor')
  button.innerHTML = label
  container.style.gridArea = gridArea
  container.appendChild(button)
  if (label !== 'Select') {
    container.addEventListener('touchstart', () => press(container))
    container.addEventListener('touchend', () => release(container))
    container.addEventListener('touchcancel', () => release(container))
  }
  return container
}

export function renderEditor() {
  const editor = div('fcitx-keyboard-editor')

  const leftButton = renderEditorButton(ChevronLeft, '1 / 1 / 4 / 3')
  setSvgStyle(leftButton, { height: '20cqh' })
  handleClick(leftButton, () => sendKeyDown('', 'ArrowLeft'))

  const upButton = renderEditorButton(ChevronLeft, '1 / 3 / 2 / 5')
  setSvgStyle(upButton, { transform: 'rotate(90deg)' })
  handleClick(upButton, () => sendKeyDown('', 'ArrowUp'))

  const rightButton = renderEditorButton(ChevronLeft, '1 / 5 / 4 / 7')
  setSvgStyle(rightButton, { height: '20cqh', transform: 'scaleX(-1)' })
  handleClick(rightButton, () => sendKeyDown('', 'ArrowRight'))

  const downButton = renderEditorButton(ChevronLeft, '3 / 3 / 4 / 5')
  setSvgStyle(downButton, { transform: 'rotate(270deg)' })
  handleClick(downButton, () => sendKeyDown('', 'ArrowDown'))

  selectButton = renderEditorButton('Select', '2 / 3 / 3 / 5')
  selectButton.addEventListener('touchstart', () => {
    sendEvent({ type: selecting ? 'DESELECT' : 'SELECT' })
    selecting ? deselect() : select()
  })

  selectAllOrCutButton = renderEditorButton('Cut', '1 / 7 / 2 / 9')
  handleClick(selectAllOrCutButton, () => sendEvent({ type: selecting ? 'CUT' : 'SELECT_ALL' }))
  adjustSelectAllOrCut()

  const copyButton = renderEditorButton('Copy', '2 / 7 / 3 / 9')
  handleClick(copyButton, () => sendEvent({ type: 'COPY' }))

  const pasteButton = renderEditorButton('Paste', '3 / 7 / 4 / 9')
  handleClick(pasteButton, () => sendEvent({ type: 'PASTE' }))

  const bsButton = renderEditorButton(Backspace, '4 / 7 / 5 / 9')
  handleClick(bsButton, backspace)

  const homeButton = renderEditorButton(FirstPage, '4 / 1 / 5 / 4')
  handleClick(homeButton, () => sendKeyDown('', 'Home'))

  const endButton = renderEditorButton(FirstPage, '4 / 4 / 5 / 7')
  setSvgStyle(endButton, { transform: 'scaleX(-1)' })
  handleClick(endButton, () => sendKeyDown('', 'End'))

  for (const button of [leftButton, upButton, rightButton, downButton, selectButton, selectAllOrCutButton, copyButton, pasteButton, bsButton, homeButton, endButton]) {
    editor.appendChild(button)
  }
  return editor
}

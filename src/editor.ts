import Backspace from 'bundle-text:../svg/backspace.svg'
import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import FirstPage from 'bundle-text:../svg/first-page.svg'
import { div, setSvgStyle } from './util'
import { backspace, sendEvent, sendKeyDown } from './ux'

let selecting = false
let selectButton: HTMLElement | null = null
let selectAllOrCutButton: HTMLElement | null = null

function adjustSelectAllOrCut() {
  const button = selectAllOrCutButton?.querySelector('.fcitx-keyboard-editor-button')
  if (!button) {
    return
  }
  button.innerHTML = selecting ? 'Cut' : 'Select all'
}

export function select() {
  selecting = true
  selectButton?.classList.add('fcitx-keyboard-pressed')
  adjustSelectAllOrCut()
}

export function deselect() {
  selecting = false
  selectButton?.classList.remove('fcitx-keyboard-pressed')
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
    container.addEventListener('touchstart', () => container.classList.add('fcitx-keyboard-pressed'))
    container.addEventListener('touchend', () => container.classList.remove('fcitx-keyboard-pressed'))
  }
  return container
}

export function renderEditor() {
  const editor = div('fcitx-keyboard-editor')

  const leftButton = renderEditorButton(ChevronLeft, '1 / 1 / 4 / 3')
  setSvgStyle(leftButton, { height: '20cqh' })
  leftButton.addEventListener('click', () => sendKeyDown('', 'ArrowLeft'))

  const upButton = renderEditorButton(ChevronLeft, '1 / 3 / 2 / 5')
  setSvgStyle(upButton, { transform: 'rotate(90deg)' })
  upButton.addEventListener('click', () => sendKeyDown('', 'ArrowUp'))

  const rightButton = renderEditorButton(ChevronLeft, '1 / 5 / 4 / 7')
  setSvgStyle(rightButton, { height: '20cqh', transform: 'scaleX(-1)' })
  rightButton.addEventListener('click', () => sendKeyDown('', 'ArrowRight'))

  const downButton = renderEditorButton(ChevronLeft, '3 / 3 / 4 / 5')
  setSvgStyle(downButton, { transform: 'rotate(270deg)' })
  downButton.addEventListener('click', () => sendKeyDown('', 'ArrowDown'))

  selectButton = renderEditorButton('Select', '2 / 3 / 3 / 5')
  selectButton.addEventListener('touchstart', () => {
    sendEvent({ type: selecting ? 'DESELECT' : 'SELECT' })
    selecting ? deselect() : select()
  })

  selectAllOrCutButton = renderEditorButton('Cut', '1 / 7 / 2 / 9')
  selectAllOrCutButton.addEventListener('click', () => sendEvent({ type: selecting ? 'CUT' : 'SELECT_ALL' }))
  adjustSelectAllOrCut()

  const copyButton = renderEditorButton('Copy', '2 / 7 / 3 / 9')
  copyButton.addEventListener('click', () => sendEvent({ type: 'COPY' }))

  const pasteButton = renderEditorButton('Paste', '3 / 7 / 4 / 9')
  pasteButton.addEventListener('click', () => sendEvent({ type: 'PASTE' }))

  const bsButton = renderEditorButton(Backspace, '4 / 7 / 5 / 9')
  bsButton.addEventListener('click', backspace)

  const homeButton = renderEditorButton(FirstPage, '4 / 1 / 5 / 4')
  homeButton.addEventListener('click', () => sendKeyDown('', 'Home'))

  const endButton = renderEditorButton(FirstPage, '4 / 4 / 5 / 7')
  setSvgStyle(endButton, { transform: 'scaleX(-1)' })
  endButton.addEventListener('click', () => sendKeyDown('', 'End'))

  for (const button of [leftButton, upButton, rightButton, downButton, selectButton, selectAllOrCutButton, copyButton, pasteButton, bsButton, homeButton, endButton]) {
    editor.appendChild(button)
  }
  return editor
}

import { selectCategory } from './symbol'
import { getCandidateBar, getStatusArea, getSymbolSelector, hide, show } from './util'

export type DisplayMode = 'initial' | 'candidates' | 'edit' | 'statusArea' | 'symbol'

const displayModeStack: DisplayMode[] = ['initial']

export function setDisplayMode(mode: DisplayMode) {
  const toolbar = document.querySelector('.fcitx-keyboard-toolbar') as HTMLElement
  const candidateBar = getCandidateBar()
  const returnBar = document.querySelector('.fcitx-keyboard-return-bar') as HTMLElement
  const keyboard = document.querySelector('.fcitx-keyboard') as HTMLElement
  const editor = document.querySelector('.fcitx-keyboard-editor') as HTMLElement
  const statusArea = getStatusArea()
  const symbolSelector = getSymbolSelector()

  function showKeyboard() {
    show(keyboard)
    for (const container of keyboard.querySelectorAll('.fcitx-keyboard-key-container.fcitx-keyboard-pressed')) {
      container.classList.remove('fcitx-keyboard-pressed')
    }
  }

  function showSymbolSelector() {
    show(symbolSelector)
    selectCategory(0)
  }

  switch (mode) {
    case 'initial':
      show(toolbar)
      hide(candidateBar)
      hide(returnBar)
      showKeyboard()
      hide(editor)
      hide(statusArea)
      hide(symbolSelector)
      break
    case 'candidates':
      hide(toolbar)
      show(candidateBar)
      hide(returnBar)
      showKeyboard()
      hide(editor)
      hide(statusArea)
      hide(symbolSelector)
      break
    case 'edit':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hide(keyboard)
      show(editor)
      hide(statusArea)
      hide(symbolSelector)
      break
    case 'statusArea':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hide(keyboard)
      hide(editor)
      show(statusArea)
      hide(symbolSelector)
      break
    case 'symbol':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hide(keyboard)
      hide(editor)
      hide(statusArea)
      showSymbolSelector()
      break
  }
  if (mode === 'initial') {
    displayModeStack.splice(0, displayModeStack.length, 'initial')
  }
  else if (mode !== displayModeStack[displayModeStack.length - 1]) {
    displayModeStack.push(mode)
  }
}

export function popDisplayModeStack() {
  if (displayModeStack.length >= 2) {
    const [mode] = displayModeStack.splice(displayModeStack.length - 2)
    setDisplayMode(mode)
  }
  else {
    setDisplayMode('initial')
  }
}

export function removeCandidatesFromStack() {
  const index = displayModeStack.indexOf('candidates')
  if (index === displayModeStack.length - 1) {
    popDisplayModeStack()
  }
  else if (index > 0) {
    displayModeStack.splice(index, 1)
  }
}

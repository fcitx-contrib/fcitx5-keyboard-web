import { collapse } from './candidates'
import { selectCategory } from './symbol'
import { getCandidateBar, getNumpad, getStatusArea, getSymbolSelector, hide, release, show } from './util'

export type DisplayMode = 'initial' | 'candidates' | 'edit' | 'statusArea' | 'symbol' | 'numpad'

let currentMode: DisplayMode = 'initial'
let returnMode: 'initial' | 'candidates' = 'initial'

export function setDisplayMode(mode: DisplayMode) {
  if (mode === 'initial') {
    returnMode = 'initial'
  }
  else if (currentMode === 'candidates' && (mode === 'symbol' || mode === 'numpad')) {
    returnMode = 'candidates'
  }
  currentMode = mode

  const toolbar = document.querySelector('.fcitx-keyboard-toolbar') as HTMLElement
  const candidateBar = getCandidateBar()
  const returnBar = document.querySelector('.fcitx-keyboard-return-bar') as HTMLElement
  returnBar.classList.toggle('fcitx-keyboard-symbol-mode', mode === 'symbol')
  const keyboard = document.querySelector('.fcitx-keyboard') as HTMLElement
  const editor = document.querySelector('.fcitx-keyboard-editor') as HTMLElement
  const statusArea = getStatusArea()
  const symbolSelector = getSymbolSelector()
  const numpad = getNumpad()

  function showSymbolSelector() {
    show(symbolSelector)
    selectCategory(0)
  }

  function hideKeyboard() {
    // Clicking symbol when other keys are pressed.
    for (const container of keyboard.querySelectorAll('.fcitx-keyboard-key-container.fcitx-keyboard-pressed')) {
      release(container)
    }
    hide(keyboard)
  }

  switch (mode) {
    case 'initial':
      show(toolbar)
      hide(candidateBar)
      hide(returnBar)
      show(keyboard)
      hide(editor)
      hide(statusArea)
      hide(symbolSelector)
      hide(numpad)
      break
    case 'candidates':
      hide(toolbar)
      show(candidateBar)
      hide(returnBar)
      show(keyboard)
      hide(editor)
      hide(statusArea)
      hide(symbolSelector)
      hide(numpad)
      break
    case 'edit':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hideKeyboard()
      show(editor)
      hide(statusArea)
      hide(symbolSelector)
      hide(numpad)
      break
    case 'statusArea':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hideKeyboard()
      hide(editor)
      show(statusArea)
      hide(symbolSelector)
      hide(numpad)
      break
    case 'symbol':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hideKeyboard()
      hide(editor)
      hide(statusArea)
      showSymbolSelector()
      hide(numpad)
      break
    case 'numpad':
      hide(toolbar)
      hide(candidateBar)
      show(returnBar)
      hideKeyboard()
      hide(editor)
      hide(statusArea)
      hide(symbolSelector)
      show(numpad)
      break
  }
}

export function updateCandidateDisplayMode() {
  if (currentMode === 'initial' || currentMode === 'candidates') {
    setDisplayMode('candidates')
  }
}

export function popDisplayMode() {
  setDisplayMode(returnMode)
  returnMode = 'initial'
}

export function clearCandidates() {
  returnMode = 'initial'
  if (currentMode === 'candidates') {
    setDisplayMode('initial')
  }
  collapse()
}

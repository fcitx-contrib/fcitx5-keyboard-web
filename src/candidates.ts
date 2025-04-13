import type { Candidate, CandidateAction } from './api'
import { showContextmenu } from './contextmenu'
import { setDisplayMode } from './display'
import { div, getCandidateBar } from './util'
import { selectCandidate, sendEvent } from './ux'

let touchId: number | null = null
let longPressId: number | null = null
let startX = 0
let startY = 0

const LONG_PRESS_THRESHOLD = 500
const DRAG_THRESHOLD = 10

function dragged(touch: Touch) {
  const { clientX, clientY } = touch
  const dX = clientX - startX
  const dY = clientY - startY
  return dX * dX + dY * dY > DRAG_THRESHOLD
}

function cancelLongPress() {
  if (longPressId) {
    clearTimeout(longPressId)
    longPressId = null
  }
}

export function setPreedit(auxUp: string, preedit: string) {
  setDisplayMode('candidates')
  const bar = getCandidateBar()
  let container = bar.querySelector('.fcitx-keyboard-preedit')
  if (auxUp || preedit) {
    if (!container) {
      container = div('fcitx-keyboard-preedit')
      bar.prepend(container)
    }
    container.innerHTML = auxUp + preedit
  }
  else {
    container?.remove()
  }
}

export function setCandidates(cands: Candidate[], highlighted: number) {
  setDisplayMode('candidates')
  touchId = null
  longPressId = null
  const container = getCandidateBar().querySelector('.fcitx-keyboard-candidates')!
  container.scroll({ left: 0 })
  container.innerHTML = ''
  for (let i = 0; i < cands.length; ++i) {
    const candidate = div('fcitx-keyboard-candidate')
    candidate.innerHTML = cands[i].text
    candidate.addEventListener('touchstart', (event) => {
      const touch = event.changedTouches[0]
      startX = touch.clientX
      startY = touch.clientY
      cancelLongPress()
      longPressId = window.setTimeout(() => {
        longPressId = null
        sendEvent({ type: 'ASK_CANDIDATE_ACTIONS', data: i })
      }, LONG_PRESS_THRESHOLD)
      touchId = event.changedTouches[0].identifier
    })
    candidate.addEventListener('touchmove', (event) => {
      const touch = event.changedTouches[0]
      // Doesn't care if same touch.
      if (dragged(touch)) {
        cancelLongPress()
      }
    })
    candidate.addEventListener('touchend', (event) => {
      const touch = event.changedTouches[0]
      if (touchId === touch.identifier) {
        if (longPressId && !dragged(touch)) {
          selectCandidate(i)
        }
        cancelLongPress()
      }
    })
    if (i === highlighted) {
      candidate.classList.add('fcitx-keyboard-highlighted')
    }
    container.appendChild(candidate)
  }
}

export function setCandidateActions(index: number, actions: CandidateAction[]) {
  const candidate = document.querySelectorAll('.fcitx-keyboard-candidate')[index]
  if (!candidate) {
    return
  }
  showContextmenu(candidate, actions.map(action => ({
    text: action.text,
    callback: () => sendEvent({ type: 'CANDIDATE_ACTION', data: {
      index,
      id: action.id,
    } }),
  })))
}

export function renderCandidateBar() {
  const container = div('fcitx-keyboard-candidates')
  const bar = div('fcitx-keyboard-candidate-bar')
  bar.appendChild(container)
  return bar
}

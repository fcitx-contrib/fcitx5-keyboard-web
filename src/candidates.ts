import type { Candidate, CandidateAction, ScrollState } from './api.d'
import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import { SCROLL_NONE, SCROLLING } from './api.d'
import { showContextmenu } from './contextmenu'
import { setDisplayMode } from './display'
import { div, getCandidateBar, renderToolbarButton } from './util'
import { DRAG_THRESHOLD, LONG_PRESS_THRESHOLD, selectCandidate, sendEvent } from './ux'

let touchId: number | null = null
let longPressId: number | null = null
let startX = 0
let startY = 0
let scrollState_: ScrollState = SCROLL_NONE
let scrollEnd_ = true
let fetching = false

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
  const container = getCandidateBar().querySelector('.fcitx-keyboard-candidates-container')!
  let element = container.querySelector('.fcitx-keyboard-preedit')
  if (auxUp || preedit) {
    if (!element) {
      element = div('fcitx-keyboard-preedit')
      container.prepend(element)
    }
    element.innerHTML = auxUp + preedit
  }
  else {
    element?.remove()
  }
  setDisplayMode('candidates')
}

export function setCandidates(cands: Candidate[], highlighted: number, scrollState: ScrollState, scrollStart: boolean, scrollEnd: boolean) {
  scrollState_ = scrollState
  touchId = null
  longPressId = null
  const container = getCandidateBar().querySelector('.fcitx-keyboard-candidates')!
  if (scrollState !== SCROLLING || scrollStart) {
    container.scroll({ left: 0 })
    container.innerHTML = ''
  }
  else {
    fetching = false
  }
  scrollEnd_ = scrollEnd
  const offset = container.childElementCount
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
        sendEvent({ type: 'ASK_CANDIDATE_ACTIONS', data: offset + i })
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
          selectCandidate(offset + i)
        }
        cancelLongPress()
      }
    })
    if (i === highlighted) {
      candidate.classList.add('fcitx-keyboard-highlighted')
    }
    container.appendChild(candidate)
  }
  setDisplayMode('candidates')
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
  const bar = div('fcitx-keyboard-candidate-bar')
  const container = div('fcitx-keyboard-candidates-container')
  const list = div('fcitx-keyboard-candidates')
  list.addEventListener('scroll', () => {
    if (scrollState_ !== SCROLLING || scrollEnd_ || fetching) {
      return
    }
    const { left } = list.lastElementChild!.getBoundingClientRect()
    if (left < list.getBoundingClientRect().right * 1.5) {
      fetching = true
      sendEvent({ type: 'SCROLL', data: { start: list.childElementCount, count: 20 } })
    }
  })
  const button = renderToolbarButton(ChevronLeft)
  button.addEventListener('click', () => {
    bar.parentElement!.classList.add('fcitx-keyboard-expanded')
  })
  container.append(list)
  bar.append(container, button)
  return bar
}

import type { Candidate, CandidateAction, ScrollState } from './api.d'
import ArrowLeft from 'bundle-text:../svg/arrow-left.svg'
import Backspace from 'bundle-text:../svg/backspace.svg'
import ChevronLeft from 'bundle-text:../svg/chevron-left.svg'
import Enter from 'bundle-text:../svg/enter.svg'
import { SCROLL_NONE, SCROLLING } from './api.d'
import { showContextmenu } from './contextmenu'
import { setDisplayMode } from './display'
import { disable, div, enable, enableScroll, getCandidateBar, handleClick, press, release, renderToolbarButton, setSvgStyle } from './util'
import { backspace, DRAG_THRESHOLD, LONG_PRESS_THRESHOLD, selectCandidate, sendEvent, sendKeyDown } from './ux'

let touchId: number | null = null
let longPressId: number | null = null
let startX = 0
let startY = 0
let scrollState_: ScrollState = SCROLL_NONE
let scrollEnd_ = true
let fetching = false
let scrollDirection: 'HORIZONTAL' | 'VERTICAL' = 'HORIZONTAL'

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

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
let timer: number | null = null
let show = false
let hasPanelPreedit = false

export function setPreedit(auxUp: string, preedit: string, caret: number) {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  hasPanelPreedit = !!preedit
  const container = getCandidateBar().querySelector('.fcitx-keyboard-candidates-container')!
  let element = container.querySelector('.fcitx-keyboard-preedit')
  if (auxUp || preedit) {
    if (!element) {
      element = div('fcitx-keyboard-preedit')
      container.prepend(element)
    }
    element.innerHTML = ''
    if (auxUp) {
      const auxUpElement = div('fcitx-keyboard-aux-up')
      auxUpElement.innerHTML = auxUp
      element.appendChild(auxUpElement)
    }
    if (preedit) {
      const preCaretElement = div('fcitx-keyboard-pre-caret')
      if (caret >= 0) {
        const preeditBytes = textEncoder.encode(preedit)
        const preCaret = textDecoder.decode(preeditBytes.subarray(0, caret))
        const postCaret = textDecoder.decode(preeditBytes.subarray(caret, preeditBytes.length))
        preCaretElement.innerHTML = preCaret
        const caretElement = div('fcitx-keyboard-caret')
        element.append(preCaretElement, caretElement)
        show = true
        timer = window.setInterval(() => {
          show = !show
          caretElement.style.opacity = show ? '1' : '0'
        }, 500)
        if (postCaret) {
          const postCaretElement = div('fcitx-keyboard-post-caret')
          postCaretElement.innerHTML = postCaret
          element.appendChild(postCaretElement)
        }
      }
      else {
        preCaretElement.innerHTML = preedit
        element.appendChild(preCaretElement)
      }
    }
  }
  else {
    element?.remove()
  }
  setDisplayMode('candidates')
}

export function setCandidates(cands: Candidate[], highlighted: number, scrollState: ScrollState, scrollStart: boolean, scrollEnd: boolean, hasClientPreedit: boolean) {
  scrollState_ = scrollState
  touchId = null
  longPressId = null
  const container = getCandidateBar().querySelector('.fcitx-keyboard-candidates')!
  if (scrollState !== SCROLLING || scrollStart) {
    container.scroll({ left: 0, top: 0 })
    container.innerHTML = ''
  }
  else {
    fetching = false
  }
  scrollEnd_ = scrollEnd
  const offset = container.childElementCount
  for (let i = 0; i < cands.length; ++i) {
    const candidate = div('fcitx-keyboard-candidate')
    const candidateInner = div('fcitx-keyboard-candidate-inner')
    candidateInner.innerHTML = cands[i].text
    candidate.appendChild(candidateInner)
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
  setPagingButtons(container)
  if (!hasPanelPreedit && !hasClientPreedit) {
    collapse()
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

function setPagingButtons(list: Element) {
  const pageUp = document.querySelector('.fcitx-keyboard-side-button-container:nth-child(1)')!
  const pageDown = document.querySelector('.fcitx-keyboard-side-button-container:nth-child(2)')!
  if (list.scrollTop === 0) {
    disable(pageUp)
  }
  else {
    enable(pageUp)
  }
  if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) { // Tolerate rounding issue.
    disable(pageDown)
  }
  else {
    enable(pageDown)
  }
}

function expand() {
  const bar = getCandidateBar()
  const parent = bar.parentElement!
  const list = bar.querySelector('.fcitx-keyboard-candidates') as HTMLElement
  const side = bar.querySelector('.fcitx-keyboard-candidates-side') as HTMLElement
  parent.classList.add('fcitx-keyboard-expanded')
  // TODO: not rotate friendly on real device
  const { height } = parent.getBoundingClientRect()
  list.style.maxHeight = `calc(${height}px - 16cqh)`
  side.style.height = `calc(${height}px - 100cqh)`
  scrollDirection = 'VERTICAL'
  setPagingButtons(list)
}

export function collapse() {
  const bar = getCandidateBar()
  const parent = bar.parentElement!
  const list = bar.querySelector('.fcitx-keyboard-candidates') as HTMLElement
  parent.classList.remove('fcitx-keyboard-expanded')
  list.style.height = 'auto'
  scrollDirection = 'HORIZONTAL'
}

function renderSideButton(label: string) {
  const container = div('fcitx-keyboard-side-button-container')
  const button = div('fcitx-keyboard-side-button')
  button.innerHTML = label
  container.appendChild(button)
  container.addEventListener('touchstart', () => press(container))
  container.addEventListener('touchend', () => release(container))
  container.addEventListener('touchcancel', () => release(container))
  return container
}

export function renderCandidateBar() {
  const bar = div('fcitx-keyboard-candidate-bar')
  const container = div('fcitx-keyboard-candidates-container')
  const list = div('fcitx-keyboard-candidates')
  enableScroll(list)
  list.addEventListener('scroll', () => {
    if (scrollState_ !== SCROLLING) {
      return
    }
    if (scrollDirection === 'VERTICAL') {
      setPagingButtons(list)
    }
    if (scrollEnd_ || fetching) {
      return
    }
    const { left, top } = list.lastElementChild!.getBoundingClientRect()
    const box = list.getBoundingClientRect()
    if (scrollDirection === 'HORIZONTAL' && left < box.right * 1.5) {
      fetching = true
      sendEvent({ type: 'SCROLL', data: { start: list.childElementCount, count: 20 } })
    }
    else if (scrollDirection === 'VERTICAL' && top - box.bottom < box.height) {
      fetching = true
      sendEvent({ type: 'SCROLL', data: { start: list.childElementCount, count: 25 } })
    }
  })
  const button = renderToolbarButton(ChevronLeft)
  handleClick(button, () => {
    if (scrollDirection === 'HORIZONTAL') {
      expand()
    }
    else {
      collapse()
    }
  })
  container.append(list)

  const pageUp = renderSideButton(ArrowLeft)
  setSvgStyle(pageUp, { height: '50cqh', transform: 'rotate(90deg)' })
  handleClick(pageUp, () => {
    const tops: number[] = []
    const { top, bottom } = list.getBoundingClientRect()
    for (const candidate of document.querySelectorAll('.fcitx-keyboard-candidate')) {
      const { top: candidateTop, bottom: candidateBottom } = candidate.getBoundingClientRect()
      if (tops[tops.length - 1] === candidateTop) {
        continue
      }
      if (candidateTop > top - 1) {
        const maxOffset = bottom - (candidateTop + candidateBottom) / 2
        for (let j = 0; j < tops.length; ++j) {
          if (top - tops[j] <= maxOffset) {
            list.scroll({ top: tops[j] - tops[0], behavior: 'smooth' })
            return
          }
        }
      }
      tops.push(candidateTop)
    }
  })

  const pageDown = renderSideButton(ArrowLeft)
  setSvgStyle(pageDown, { height: '50cqh', transform: 'rotate(270deg)' })
  handleClick(pageDown, () => {
    const { bottom } = list.getBoundingClientRect()
    let previousTop = 0
    let firstTop: number | null = null
    for (const candidate of document.querySelectorAll('.fcitx-keyboard-candidate')) {
      const { top: candidateTop, bottom: candidateBottom } = candidate.getBoundingClientRect()
      firstTop = firstTop ?? candidateTop
      if ((candidateTop + candidateBottom) / 2 > bottom) {
        break
      }
      previousTop = candidateTop
    }
    list.scroll({ top: previousTop - firstTop!, behavior: 'smooth' })
  })

  const bs = renderSideButton(Backspace)
  setSvgStyle(bs, { height: '60cqh' })
  handleClick(bs, backspace)

  const enter = renderSideButton(Enter)
  setSvgStyle(enter, { height: '60cqh' })
  handleClick(enter, () => sendKeyDown('\r', 'Enter'))

  const side = div('fcitx-keyboard-candidates-side')
  side.append(pageUp, pageDown, bs, enter)
  bar.append(container, button, side)
  return bar
}

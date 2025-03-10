import type { Candidate } from './api'
import { div, getCandidateBar, getToolbar, hide, show } from './util'
import { selectCandidate } from './ux'

export function setCandidates(cands: Candidate[], highlighted: number) {
  hide(getToolbar())
  const candidateBar = getCandidateBar()
  show(candidateBar)
  candidateBar.innerHTML = ''
  for (let i = 0; i < cands.length; ++i) {
    const candidate = div('fcitx-keyboard-candidate')
    candidate.innerHTML = cands[i].text
    candidate.addEventListener('click', () => {
      selectCandidate(i)
    })
    if (i === highlighted) {
      candidate.classList.add('fcitx-keyboard-highlighted')
    }
    candidateBar.appendChild(candidate)
  }
}

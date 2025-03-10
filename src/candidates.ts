import type { Candidate } from './api'
import { div, getCandidateBar, getToolbar, hide, show } from './util'

export function setCandidates(cands: Candidate[], highlighted: number) {
  hide(getToolbar())
  const candidateBar = getCandidateBar()
  show(candidateBar)
  candidateBar.innerHTML = ''
  for (let i = 0; i < cands.length; ++i) {
    const candidate = div('fcitx-keyboard-candidate')
    candidate.innerHTML = cands[i].text
    if (i === highlighted) {
      candidate.classList.add('fcitx-keyboard-highlighted')
    }
    candidateBar.appendChild(candidate)
  }
}

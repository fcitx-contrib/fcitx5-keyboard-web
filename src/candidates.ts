import type { Candidate } from './api'
import { div, getCandidateBar, setDisplayMode } from './util'
import { selectCandidate } from './ux'

export function setCandidates(cands: Candidate[], highlighted: number) {
  setDisplayMode('candidates')
  const candidateBar = getCandidateBar()
  candidateBar.scroll({ left: 0 })
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

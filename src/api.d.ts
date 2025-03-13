export interface Candidate {
  text: string
  label: string
  comment: string
}

export type SystemEvent = {
  type: 'ENTER_KEY_TYPE'
  data: string
} | {
  type: 'CLEAR' | 'HIDE'
} | {
  type: 'CANDIDATES'
  data: {
    candidates: Candidate[]
    highlighted: number
  }
}

export type VirtualKeyboardEvent = {
  type: 'KEY_DOWN' | 'KEY_UP'
  data: {
    key: string
    code: string
  }
} | {
  type: 'UNDO' | 'REDO' | 'CUT' | 'COPY' | 'PASTE'
} | {
  type: 'SELECT_CANDIDATE'
  data: number
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

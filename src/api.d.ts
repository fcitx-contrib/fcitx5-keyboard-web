export interface Candidate {
  text: string
  label: string
  comment: string
}

export interface StatusAreaAction {
  id: number
  desc: string
  icon: string
  checked?: boolean
  separator?: boolean
  children?: StatusAreaAction[]
}

export interface InputMethod {
  name: string
  displayName: string
}

export interface CandidateAction {
  id: number
  text: string
}

export type SystemEvent = {
  type: 'ENTER_KEY_TYPE'
  data: string
} | {
  type: 'CLEAR' | 'HIDE' | 'SELECT' | 'DESELECT'
} | {
  type: 'UNDO' | 'REDO'
  data: boolean
} | {
  type: 'CANDIDATES'
  data: {
    candidates: Candidate[]
    highlighted: number
  }
} | {
  type: 'CANDIDATE_ACTIONS'
  data: {
    index: number
    actions: CandidateAction[]
  }
} | {
  type: 'STATUS_AREA'
  data: {
    actions: StatusAreaAction[]
    currentInputMethod: string
    inputMethods: InputMethod[]
  }
}

export type VirtualKeyboardEvent = {
  type: 'KEY_DOWN' | 'KEY_UP'
  data: {
    key: string
    code: string
  }
} | {
  type: 'COMMIT'
  data: string
} | {
  type: 'UNDO' | 'REDO' | 'CUT' | 'COPY' | 'PASTE' | 'COLLAPSE' |
    'SELECT' | 'DESELECT' | 'SELECT_ALL' | 'GLOBE'
} | {
  type: 'SELECT_CANDIDATE' | 'ASK_CANDIDATE_ACTIONS' | 'STATUS_AREA_ACTION'
  data: number
} | {
  type: 'CANDIDATE_ACTION'
  data: {
    index: number
    id: number
  }
} | {
  type: 'BACKSPACE_SLIDE'
  data: 'LEFT' | 'RIGHT' | 'RELEASE'
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

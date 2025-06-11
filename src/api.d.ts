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

export const SCROLL_NONE = 0
export const SCROLL_READY = 1
export const SCROLLING = 2
export type ScrollState = typeof SCROLL_NONE | typeof SCROLL_READY | typeof SCROLLING

export type SystemEvent = {
  type: 'ENTER_KEY_TYPE'
  data: string
} | {
  type: 'CLEAR' | 'HIDE' | 'SELECT' | 'DESELECT'
} | {
  type: 'UNDO' | 'REDO'
  data: boolean
} | {
  type: 'PREEDIT'
  data: {
    auxUp: string
    preedit: string
    caret: number
  }
} | {
  type: 'CANDIDATES'
  data: {
    candidates: Candidate[]
    highlighted: number
    scrollState: ScrollState
    scrollStart: boolean
    scrollEnd: boolean
  }
} | {
  type: 'CANDIDATE_ACTIONS'
  data: {
    index: number
    actions: CandidateAction[]
  }
} | {
  type: 'STATUS_AREA'
  data: StatusAreaAction[]
} | {
  type: 'INPUT_METHODS'
  data: {
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
  type: 'COMMIT' | 'SET_INPUT_METHOD'
  data: string
} | {
  type: 'UNDO' | 'REDO' | 'CUT' | 'COPY' | 'PASTE' | 'COLLAPSE'
    | 'SELECT' | 'DESELECT' | 'SELECT_ALL' | 'GLOBE'
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
} | {
  type: 'SCROLL'
  data: {
    start: number
    count: number
  }
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

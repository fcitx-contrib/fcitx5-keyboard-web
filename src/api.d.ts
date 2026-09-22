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
  checked?: boolean
  checkable?: boolean
  separator?: boolean
}

export interface InputContextEvent {
  inputContext: string
  generation: number
}

export const SCROLL_NONE = 0
export const SCROLL_READY = 1
export const SCROLLING = 2
export type ScrollState = typeof SCROLL_NONE | typeof SCROLL_READY | typeof SCROLLING

export type InputType = 'text' | 'number' | 'password' | 'tel' | 'email' | 'url' | 'search'

export type SystemEvent = {
  type: 'ENTER_KEY_TYPE'
  data: string
} | {
  type: 'INPUT_TYPE'
  data: InputType
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
  data: InputContextEvent & {
    candidates: Candidate[]
    highlighted: number
    scrollState: ScrollState
    scrollStart: boolean
    scrollEnd: boolean
    hasClientPreedit: boolean
    tabActions: CandidateAction[]
  }
} | {
  type: 'CANDIDATE_ACTIONS'
  data: InputContextEvent & {
    index: number
    actions: CandidateAction[]
  }
} | {
  type: 'STATUS_AREA'
  data: InputContextEvent & {
    actions: StatusAreaAction[]
  }
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
  type: 'SELECT_CANDIDATE' | 'ASK_CANDIDATE_ACTIONS'
  data: InputContextEvent & {
    index: number
  }
} | {
  type: 'CANDIDATE_ACTION'
  data: InputContextEvent & {
    index: number
    id: number
  }
} | {
  type: 'CANDIDATE_TAB_ACTION'
  data: InputContextEvent & {
    id: number
  }
} | {
  type: 'STATUS_AREA_ACTION'
  data: InputContextEvent & {
    id: number
  }
} | {
  type: 'BACKSPACE_SLIDE'
  data: 'LEFT' | 'RIGHT' | 'RELEASE'
} | {
  type: 'SCROLL'
  data: InputContextEvent & {
    start: number
    count: number
  }
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

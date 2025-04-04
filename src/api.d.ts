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
    'SELECT' | 'DESELECT' | 'SELECT_ALL'
} | {
  type: 'SELECT_CANDIDATE' | 'STATUS_AREA_ACTION'
  data: number
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

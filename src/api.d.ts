export interface SystemEvent {
  type: 'ENTER_KEY_TYPE'
  data: string
}

export interface VirtualKeyboardEvent {
  type: 'KEY_DOWN' | 'KEY_UP'
  data: {
    key: string
    code: string
  }
}

export interface VirtualKeyboardClient {
  sendEvent: (event: VirtualKeyboardEvent) => void
}

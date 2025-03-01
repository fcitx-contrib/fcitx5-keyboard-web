export type SystemEvent = {
  type: 'ENTER_KEY_TYPE'
  data: string
} | {
  type: 'HIDE'
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

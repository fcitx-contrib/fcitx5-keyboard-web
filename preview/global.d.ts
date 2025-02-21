import type { VirtualKeyboardEvent } from '../src/api'

declare global {
  interface Window {
    sentEvents: VirtualKeyboardEvent[]
    onMessage: (message: string) => void
  }
}

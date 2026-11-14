import type { VirtualKeyboardEvent } from '../src/api'
import type { setBuiltInLayout } from '../src/keyboard'

declare global {
  interface Window {
    sentEvents: VirtualKeyboardEvent[]
    touches: Touch[]
    onMessage: (message: string) => void
    setBuiltInLayout: typeof setBuiltInLayout
  }
}

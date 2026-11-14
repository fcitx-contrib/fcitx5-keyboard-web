import type { VirtualKeyboardEvent } from '../src/api'
import { onMessage, setBuiltInLayout } from '../src/keyboard'
import { setClient } from '../src/ux'

window.sentEvents = []
window.onMessage = onMessage
window.setBuiltInLayout = setBuiltInLayout

setClient({
  sendEvent(event: VirtualKeyboardEvent) {
    console.info(JSON.stringify(event)) // eslint-disable-line no-console
    window.sentEvents.push(event)
  },
})

setBuiltInLayout('fcitx-app', 'qwerty')

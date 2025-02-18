import type { VirtualKeyboardEvent } from '../src/api'
import { setBuiltInLayout } from '../src/keyboard'
import { setClient } from '../src/ux'

window.sentEvents = []

setClient({
  sendEvent(event: VirtualKeyboardEvent) {
    window.sentEvents.push(event)
  },
})

setBuiltInLayout('fcitx-app', 'qwerty')

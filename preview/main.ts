import type { VirtualKeyboardEvent } from '../src/api'
import { setBuiltInLayout } from '../src/keyboard'
import { setClient } from '../src/ux'

setClient({
  sendEvent(event: VirtualKeyboardEvent) {
    console.info(JSON.stringify(event)) // eslint-disable-line no-console
  },
})

setBuiltInLayout('fcitx-app', 'qwerty')

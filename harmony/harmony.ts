import type { VirtualKeyboardEvent } from '../src/api'
import { onMessage, setBuiltInLayout } from '../src/keyboard'
import { setClient } from '../src/ux'

let port: MessagePort | null = null

window.addEventListener('message', (event: MessageEvent<string>) => {
  if (event.data === '__init_port__') {
    port = event.ports[0]
    port.onmessage = (event: MessageEvent<string>) => {
      onMessage(event.data)
    }
  }
})

setClient({
  sendEvent(event: VirtualKeyboardEvent) {
    port?.postMessage(JSON.stringify(event))
  },
})

setBuiltInLayout('fcitx-app', 'qwerty')

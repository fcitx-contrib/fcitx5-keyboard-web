import type { VirtualKeyboardEvent } from '../src/api'
import { setBuiltInLayout } from '../src/keyboard'
import { setClient } from '../src/ux'

let port: MessagePort

function onMessage(event: MessageEvent<string>) {
  console.log(event.data) // eslint-disable-line no-console
}

window.addEventListener('message', (event: MessageEvent<string>) => {
  if (event.data === '__init_port__') {
    port = event.ports[0]
    port.onmessage = onMessage
  }
})

setClient({
  sendEvent(event: VirtualKeyboardEvent) {
    port.postMessage(JSON.stringify(event))
  },
})

setBuiltInLayout('fcitx-app', 'qwerty')

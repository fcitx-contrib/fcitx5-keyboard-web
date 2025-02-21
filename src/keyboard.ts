import type { SystemEvent } from './api'
import type { BUILTIN_LAYOUT, Layout } from './layout'
import presetCss from 'bundle-text:./preset.css'
import qwerty from '../layouts/qwerty.json'
import { renderRow } from './key'
import { div } from './util'
import { onTouchEnd, onTouchStart, setEnterKeyType, setLayout as setLayout_ } from './ux'

const builtInLayoutMap = { qwerty } as { [key: string]: Layout }

export function setLayout(id: string, layout: Layout) {
  setLayout_(layout)

  const style = document.createElement('style')
  style.textContent = presetCss

  const toolbar = div('fcitx-keyboard-toolbar')

  const keyboard = div('fcitx-keyboard')
  for (const layer of layout.layers) {
    if (layer.id === 'default') {
      for (const row of layer.rows) {
        keyboard.appendChild(renderRow(row, {
          layer: layer.id,
          locked: false,
        }))
      }
      break
    }
  }

  keyboard.addEventListener('touchstart', onTouchStart)
  keyboard.addEventListener('touchend', onTouchEnd)

  const container = div('fcitx-keyboard-container')
  container.appendChild(style)
  container.appendChild(toolbar)
  container.appendChild(keyboard)

  const app = document.getElementById(id)!
  app.innerHTML = ''
  app.appendChild(container)
}

export function setBuiltInLayout(id: string, name: BUILTIN_LAYOUT) {
  setLayout(id, builtInLayoutMap[name])
}

export function onMessage(message: string) {
  const event = JSON.parse(message) as SystemEvent
  switch (event.type) {
    case 'ENTER_KEY_TYPE':
      setEnterKeyType(event.data)
      break
  }
}

import type { SystemEvent } from './api'
import type { BUILTIN_LAYOUT, Layout } from './layout'
import presetCss from 'bundle-text:./preset.css'
import qwerty from '../layouts/qwerty.json'
import { setCandidates } from './candidates'
import { renderEditor } from './editor'
import { renderRow } from './key'
import { renderReturnBar } from './return'
import { renderStatusArea, setStatusArea } from './statusArea'
import { renderToolbar } from './toolbar'
import { div, getDisplayMode, setDisplayMode } from './util'
import { onTouchEnd, onTouchStart, setEnterKeyType, setLayer, setLayout as setLayout_ } from './ux'

const builtInLayoutMap = { qwerty } as { [key: string]: Layout }

export function setLayout(id: string, layout: Layout) {
  setLayout_(layout)

  const style = document.createElement('style')
  style.textContent = presetCss

  const toolbar = renderToolbar()
  const candidateBar = div('fcitx-keyboard-candidates')
  const returnBar = renderReturnBar()

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

  // Use a mask layer above the keyboard to handle all events, otherwise
  // layer change will destroy event target thus make touchend not fired.
  const mask = div('fcitx-keyboard-mask')
  mask.classList.add('fcitx-keyboard-frame')
  mask.addEventListener('touchstart', onTouchStart)
  mask.addEventListener('touchend', onTouchEnd)

  const editor = renderEditor()
  editor.classList.add('fcitx-keyboard-frame')

  const statusArea = renderStatusArea()
  statusArea.classList.add('fcitx-keyboard-frame')

  const container = div('fcitx-keyboard-container')
  container.appendChild(style)
  container.appendChild(toolbar)
  container.appendChild(candidateBar)
  container.appendChild(returnBar)
  container.appendChild(keyboard)
  container.appendChild(mask)
  container.appendChild(editor)
  container.appendChild(statusArea)

  const app = document.getElementById(id)!
  app.innerHTML = ''
  app.appendChild(container)
  setDisplayMode('initial')
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
    case 'HIDE':
      setLayer('default', false)
    // fall through
    case 'CLEAR':
      if (getDisplayMode() === 'candidates') {
        setDisplayMode('initial')
      }
      break
    case 'CANDIDATES':
      setCandidates(event.data.candidates, event.data.highlighted)
      break
    case 'STATUS_AREA':
      setStatusArea(event.data)
      break
  }
}

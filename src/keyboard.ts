import type { BUILTIN_LAYOUT, Layout, Row } from './layout'
import presetCss from 'bundle-text:./preset.css'
import qwerty from '../layouts/qwerty.json'
import { renderKey } from './key'
import { div } from './util'
import { onTouchEnd, onTouchStart } from './ux'

const builtInLayoutMap = { qwerty } as { [key: string]: Layout }

function renderRow(row: Row) {
  const el = div('fcitx-keyboard-row')
  for (const key of row.keys) {
    el.appendChild(renderKey(key))
  }
  return el
}

export function setLayout(id: string, layout: Layout) {
  const style = document.createElement('style')
  style.textContent = presetCss

  const toolbar = div('fcitx-keyboard-toolbar')

  const keyboard = div('fcitx-keyboard')
  for (const row of layout.layers[0].rows) {
    keyboard.appendChild(renderRow(row))
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

import type { Key, Style } from './layout'
import { div } from './util'

export function renderKey(key: Key) {
  const style: Style = {}
  if (key.flex) {
    style.flex = key.flex
  }
  const container = div('fcitx-keyboard-key-container', style)

  switch (key.type) {
    case 'key': {
      const el = div('fcitx-keyboard-key')
      el.textContent = key.label ?? ''
      container.appendChild(el)
      break
    }
  }
  return container
}

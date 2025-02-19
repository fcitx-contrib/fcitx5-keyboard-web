import type { Context, Key, Row, Style } from './layout'
import ShiftFiled from 'bundle-text:../svg/shift-filled.svg'
import Shift from 'bundle-text:../svg/shift.svg'
import { div } from './util'

export function renderKey(key: Key, context: Context) {
  const dataKey = JSON.stringify(key)
  const style: Style = {}
  if ('flex' in key) {
    style.flex = key.flex
  }
  const container = div('fcitx-keyboard-key-container', style)

  switch (key.type) {
    case 'key': {
      const el = div('fcitx-keyboard-key')
      el.textContent = key.label ?? ''
      container.appendChild(el)
      container.setAttribute('data-key', dataKey)
      break
    }
    case 'shift': {
      const el = div('fcitx-keyboard-key')
      el.classList.add('fcitx-keyboard-shift')
      el.innerHTML = context.layer === 'shift' ? ShiftFiled : Shift
      container.appendChild(el)
      container.setAttribute('data-key', dataKey)
    }
  }
  return container
}

export function renderRow(row: Row, context: Context) {
  const el = div('fcitx-keyboard-row')
  for (const key of row.keys) {
    el.appendChild(renderKey(key, context))
  }
  return el
}

import type { Context, Key, Row, Style } from './layout'
import Backspace from 'bundle-text:../svg/backspace.svg'
import ShiftFiled from 'bundle-text:../svg/shift-filled.svg'
import ShiftUppercaseFiled from 'bundle-text:../svg/shift-uppercase-filled.svg'
import Shift from 'bundle-text:../svg/shift.svg'
import { DATA_KEY, div } from './util'
import { getEnterKeyInnerHTML } from './ux'

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
      container.setAttribute(DATA_KEY, dataKey)
      break
    }
    case 'backspace': {
      const el = div('fcitx-keyboard-key')
      el.classList.add('fcitx-keyboard-backspace')
      el.innerHTML = Backspace
      container.appendChild(el)
      container.setAttribute(DATA_KEY, dataKey)
      break
    }
    case 'enter': {
      const el = div('fcitx-keyboard-key')
      el.classList.add('fcitx-keyboard-enter')
      el.innerHTML = getEnterKeyInnerHTML()
      container.appendChild(el)
      container.setAttribute(DATA_KEY, dataKey)
      break
    }
    case 'shift': {
      const el = div('fcitx-keyboard-key')
      el.classList.add('fcitx-keyboard-shift')
      if (context.layer === 'shift') {
        container.classList.add('fcitx-keyboard-pressed')
      }
      el.innerHTML = context.layer === 'shift' ? (context.locked ? ShiftUppercaseFiled : ShiftFiled) : Shift
      container.appendChild(el)
      container.setAttribute(DATA_KEY, dataKey)
      break
    }
    case 'symbol': {
      const el = div('fcitx-keyboard-key')
      el.classList.add('fcitx-keyboard-symbol')
      el.innerHTML = '#+='
      container.appendChild(el)
      container.setAttribute(DATA_KEY, dataKey)
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

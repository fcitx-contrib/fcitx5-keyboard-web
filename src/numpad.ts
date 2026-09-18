import type { Key, Row } from './layout'
import { renderRow } from './key'
import { div } from './util'

const sideColumnFlex = '9'
const middleColumnFlex = '14'
const halfMiddleColumnFlex = '7'

function normalKey(label: string, flex: string = middleColumnFlex): Key {
  return {
    type: 'key',
    label,
    key: label,
    flex,
    commit: true,
  }
}

const rows: Row[] = [
  { keys: [normalKey('+', sideColumnFlex), normalKey('1'), normalKey('2'), normalKey('3'), normalKey('=', sideColumnFlex)] },
  { keys: [normalKey('-', sideColumnFlex), normalKey('4'), normalKey('5'), normalKey('6'), normalKey('@', sideColumnFlex)] },
  { keys: [normalKey('*', sideColumnFlex), normalKey('7'), normalKey('8'), normalKey('9'), { type: 'backspace', flex: sideColumnFlex }] },
  {
    keys: [
      normalKey('/', sideColumnFlex),
      normalKey(','),
      normalKey('0'),
      { type: 'space', flex: halfMiddleColumnFlex, commit: true },
      normalKey('.', halfMiddleColumnFlex),
      { type: 'enter', flex: sideColumnFlex },
    ],
  },
]

export function renderNumpad() {
  const numpad = div('fcitx-keyboard-numpad')
  for (const row of rows) {
    numpad.appendChild(renderRow(row, { layer: 'default', locked: false }))
  }
  numpad.querySelector('.fcitx-keyboard-backspace')?.classList.replace('fcitx-keyboard-backspace', 'fcitx-keyboard-numpad-backspace')
  numpad.querySelector('.fcitx-keyboard-enter')?.classList.replace('fcitx-keyboard-enter', 'fcitx-keyboard-numpad-enter')
  numpad.querySelector('.fcitx-keyboard-space')?.classList.replace('fcitx-keyboard-space', 'fcitx-keyboard-numpad-space')
  return numpad
}

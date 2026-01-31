import type { StatusAreaAction } from './api'
import FullPunc from 'bundle-text:../svg/full-punc.svg'
import FullWidth from 'bundle-text:../svg/full-width.svg'
import HalfPunc from 'bundle-text:../svg/half-punc.svg'
import HalfWidth from 'bundle-text:../svg/half-width.svg'
import LightbulbOutline from 'bundle-text:../svg/lightbulb-outline.svg'
import Lightbulb from 'bundle-text:../svg/lightbulb.svg'
import { showContextmenu } from './contextmenu'
import { div, getStatusArea, handleClick } from './util'
import { sendEvent } from './ux'

export function renderStatusArea() {
  return div('fcitx-keyboard-status-area')
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

function getLabel(icon: string, desc: string): [string, boolean /* isText */] {
  switch (icon) {
    case 'fcitx-chttrans-active':
      return ['繁', true]
    case 'fcitx-chttrans-inactive':
      return ['简', true]
    case 'fcitx-fullwidth-active':
      return [FullWidth, false]
    case 'fcitx-fullwidth-inactive':
      return [HalfWidth, false]
    case 'fcitx-punc-active':
      return [FullPunc, false]
    case 'fcitx-punc-inactive':
      return [HalfPunc, false]
    case 'fcitx-remind-active':
      return [Lightbulb, false]
    case 'fcitx-remind-inactive':
      return [LightbulbOutline, false]
    default: {
      const segmentData = Array.from(segmenter.segment(desc))
      return [segmentData.length ? segmentData[0].segment : '', true]
    }
  }
}

export function setStatusArea(actions: StatusAreaAction[]) {
  const statusArea = getStatusArea()
  statusArea.innerHTML = ''
  for (const action of actions) {
    const button = div('fcitx-keyboard-status-area-container')
    const circle = div('fcitx-keyboard-status-area-circle')
    const [label, isText] = getLabel(action.icon, action.desc)
    if (isText) {
      circle.textContent = label
    }
    else {
      circle.innerHTML = label
    }
    handleClick(circle, () => {
      if (action.children) {
        showContextmenu(circle, action.children.map(child => ({
          text: child.desc,
          separator: child.separator,
          callback: () => {
            sendEvent({ type: 'STATUS_AREA_ACTION', data: child.id })
          },
        })))
      }
      else {
        sendEvent({ type: 'STATUS_AREA_ACTION', data: action.id })
      }
    })
    const text = div('fcitx-keyboard-status-area-text')
    text.textContent = action.desc
    button.appendChild(circle)
    button.appendChild(text)
    statusArea.appendChild(button)
  }
}

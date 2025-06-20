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

function getLabel(icon: string, desc: string) {
  switch (icon) {
    case 'fcitx-chttrans-active':
      return '繁'
    case 'fcitx-chttrans-inactive':
      return '简'
    case 'fcitx-fullwidth-active':
      return FullWidth
    case 'fcitx-fullwidth-inactive':
      return HalfWidth
    case 'fcitx-punc-active':
      return FullPunc
    case 'fcitx-punc-inactive':
      return HalfPunc
    case 'fcitx-remind-active':
      return Lightbulb
    case 'fcitx-remind-inactive':
      return LightbulbOutline
    default: {
      const segmentData = Array.from(segmenter.segment(desc))
      return segmentData.length ? segmentData[0].segment : ''
    }
  }
}

export function setStatusArea(actions: StatusAreaAction[]) {
  const statusArea = getStatusArea()
  statusArea.innerHTML = ''
  for (const action of actions) {
    const button = div('fcitx-keyboard-status-area-container')
    const circle = div('fcitx-keyboard-status-area-circle')
    circle.innerHTML = getLabel(action.icon, action.desc)
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
    text.innerHTML = action.desc
    button.appendChild(circle)
    button.appendChild(text)
    statusArea.appendChild(button)
  }
}

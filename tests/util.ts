import type {
  Locator,
  Page,
} from '@playwright/test'
import type { SystemEvent } from '../src/api'
import { dirname, join } from 'node:path'

export const WHITE = 'rgb(255, 255, 255)'
export const GRAY = 'rgb(188, 192, 199)'

export async function init(page: Page) {
  const url = `file://${join(dirname(import.meta.url), '..', 'dist', 'preview', 'index.html').substring('file:'.length)}`
  await page.goto(url)
}

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

let touchId = 0

export async function touchDown(locator: Locator) {
  const ctr = await center(locator)
  await locator.page().evaluate((arg) => {
    const { touchId, center } = arg
    window.touches ||= []
    const mask = document.querySelector('.fcitx-keyboard-mask')!
    const touch = new Touch({
      identifier: touchId,
      target: mask,
      clientX: center.x,
      clientY: center.y,
    })
    window.touches.push(touch)
    const touchEvent = new TouchEvent('touchstart', {
      touches: window.touches,
      changedTouches: [touch],
    })
    mask.dispatchEvent(touchEvent)
  }, { touchId, center: ctr })
  return touchId++
}

export async function touchUp(locator: Locator, touchId: number) {
  const ctr = await center(locator)
  await locator.page().evaluate((arg) => {
    const { touchId, center } = arg
    const mask = document.querySelector('.fcitx-keyboard-mask')!
    const touch = new Touch({
      identifier: touchId,
      target: mask,
      clientX: center.x,
      clientY: center.y,
    })
    window.touches = window.touches.filter(touch => touch.identifier !== touchId)
    const touchEvent = new TouchEvent('touchend', {
      touches: window.touches,
      changedTouches: [touch],
    })
    mask.dispatchEvent(touchEvent)
  }, { touchId, center: ctr })
}

export async function tap(locator: Locator) {
  const touchId = await touchDown(locator)
  return touchUp(locator, touchId)
}

export function getSentEvents(page: Page) {
  return page.evaluate(() => window.sentEvents)
}

export function sendSystemEvent(page: Page, event: SystemEvent) {
  return page.evaluate((event: SystemEvent) => {
    window.onMessage(JSON.stringify(event))
  }, event)
}

import type {
  Locator,
  Page,
} from '@playwright/test'
import type { SystemEvent } from '../src/api'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const WHITE = 'rgb(255, 255, 255)'
export const GRAY = 'rgb(188, 192, 199)'

export async function init(page: Page) {
  const baseDir = dirname(dirname(fileURLToPath(import.meta.url)))
  const url = `file://${join(baseDir, 'dist', 'preview', 'index.html')}`
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

export async function touchUp(locator: Locator, touchId: number, cancel: boolean = false) {
  const ctr = await center(locator)
  await locator.page().evaluate((arg) => {
    const { touchId, center, cancel } = arg
    const mask = document.querySelector('.fcitx-keyboard-mask')!
    const touch = new Touch({
      identifier: touchId,
      target: mask,
      clientX: center.x,
      clientY: center.y,
    })
    window.touches = window.touches.filter(touch => touch.identifier !== touchId)
    const touchEvent = new TouchEvent(cancel ? 'touchcancel' : 'touchend', {
      touches: window.touches,
      changedTouches: [touch],
    })
    mask.dispatchEvent(touchEvent)
  }, { touchId, center: ctr, cancel })
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

export function getKey(page: Page, key: string) {
  return page.locator('.fcitx-keyboard').getByText(key)
}

export function getToolbarButton(page: Page, nth: number) {
  return page.locator(`.fcitx-keyboard-toolbar .fcitx-keyboard-toolbar-button:nth-child(${nth})`)
}

export function tapReturn(page: Page) {
  return page.locator('.fcitx-keyboard-return-bar .fcitx-keyboard-toolbar-button').tap()
}

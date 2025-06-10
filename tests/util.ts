import type {
  Locator,
  Page,
} from '@playwright/test'
import type { SystemEvent } from '../src/api'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const WHITE = 'rgb(255, 255, 255)'
export const GRAY = 'rgb(188, 192, 199)'
export const ENABLED = 'rgb(89, 90, 92)'
export const DISABLED = 'rgb(127, 127, 127)'

export async function init(page: Page) {
  const baseDir = dirname(dirname(fileURLToPath(import.meta.url)))
  const url = `file://${join(baseDir, 'dist', 'preview', 'index.html')}`
  await page.goto(url)
}

export async function getBox(locator: Locator) {
  return (await locator.boundingBox())!
}

async function center(locator: Locator) {
  const box = await getBox(locator)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function isInside(point: { x: number, y: number }, locator: Locator) {
  const box = await getBox(locator)
  return box.x <= point.x && point.x <= box.x + box.width && box.y <= point.y && point.y <= box.y + box.height
}

function isUnderMask(point: { x: number, y: number }, page: Page) {
  return isInside(point, page.locator('.fcitx-keyboard-mask'))
}

let touchId = 0

export async function touchDown(locator: Locator) {
  const ctr = await center(locator)
  const underMask = await isUnderMask(ctr, locator.page())
  await locator.page().evaluate((arg) => {
    const { touchId, center, underMask, element } = arg
    window.touches ||= []
    const target = underMask ? document.querySelector('.fcitx-keyboard-mask')! : element
    const touch = new Touch({
      identifier: touchId,
      target,
      clientX: center.x,
      clientY: center.y,
    })
    window.touches.push(touch)
    const touchEvent = new TouchEvent('touchstart', {
      touches: window.touches,
      changedTouches: [touch],
    })
    target.dispatchEvent(touchEvent)
  }, { touchId, center: ctr, underMask, element: (await locator.elementHandle())! })
  return touchId++
}

export async function touchMove(locator: Locator, touchId: number, dx: number, dy: number) {
  return locator.page().evaluate((arg) => {
    const { touchId, dx, dy } = arg
    const i = window.touches.findIndex(touch => touch.identifier === touchId)
    const { target, clientX, clientY } = window.touches.splice(i, 1)[0]
    const touch = new Touch({ identifier: touchId, target, clientX: clientX + dx, clientY: clientY + dy })
    window.touches.push(touch)
    const touchEvent = new TouchEvent('touchmove', {
      touches: window.touches,
      changedTouches: [touch],
    })
    target.dispatchEvent(touchEvent)
  }, { touchId, dx, dy })
}

export function touchUp(locator: Locator, touchId: number, cancel: boolean = false) {
  return locator.page().evaluate((arg) => {
    const { touchId, cancel } = arg
    const i = window.touches.findIndex(touch => touch.identifier === touchId)
    const { target, clientX, clientY } = window.touches.splice(i, 1)[0]
    const touch = new Touch({ identifier: touchId, target, clientX, clientY })
    const touchEvent = new TouchEvent(cancel ? 'touchcancel' : 'touchend', {
      touches: window.touches,
      changedTouches: [touch],
    })
    target.dispatchEvent(touchEvent)
  }, { touchId, cancel })
}

export async function tap(locator: Locator) {
  const touchId = await touchDown(locator)
  return touchUp(locator, touchId)
}

export async function longPress(locator: Locator, action?: (touchId: number) => Promise<any>) {
  const touchId = await touchDown(locator)
  await locator.page().waitForTimeout(300)
  action && await action(touchId)
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

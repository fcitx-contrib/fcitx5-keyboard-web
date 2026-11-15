import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getSentEvents, getToolbarButton, init, tap, touchDown, touchUp } from './util'

const leftEvent = {
  type: 'KEY_DOWN',
  data: { key: '', code: 'ArrowLeft' },
}

function touchDownWithId(button: Locator, identifier: number) {
  return button.evaluate((element, identifier) => {
    const box = element.getBoundingClientRect()
    const touch = new Touch({
      identifier,
      target: element,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    })
    window.touches.push(touch)
    element.dispatchEvent(new TouchEvent('touchstart', {
      touches: window.touches,
      changedTouches: [touch],
      bubbles: true,
    }))
  }, identifier)
}

function captureTimer(page: Page, kind: 'setTimeout' | 'setInterval') {
  return page.evaluateHandle((kind) => {
    const callbacks: (() => void)[] = []
    const original = window[kind].bind(window)
    Object.defineProperty(window, kind, {
      configurable: true,
      value(handler: TimerHandler, timeout?: number, ...args: unknown[]) {
        if (typeof handler === 'function' && timeout === (kind === 'setTimeout'
          ? 300
          : 80)) {
          callbacks.push(() => handler(...args))
        }
        return original(handler, timeout, ...args)
      },
    })
    return callbacks
  }, kind)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await tap(getToolbarButton(page, 4))
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

for (const oldFirst of [true, false]) {
  test(`A fresh same-button arrow tap replaces the old touch (old release first: ${oldFirst})`, async ({ page }) => {
    const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
    const old = await touchDown(left)
    const fresh = await touchDown(left)
    for (const id of oldFirst
      ? [old, fresh]
      : [fresh, old]) {
      await touchUp(left, id)
    }
    expect(await getSentEvents(page)).toEqual([leftEvent])
  })
}

for (const cancel of [false, true]) {
  test(`An old arrow ${cancel ? 'cancel' : 'release'} cannot clear the new owner's highlight`, async ({ page }) => {
    const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
    const old = await touchDown(left)
    const fresh = await touchDown(left)
    await touchUp(left, old, cancel)
    expect(await left.evaluate(element => element.classList.contains('fcitx-keyboard-pressed'))).toBe(true)
    await touchUp(left, fresh)
    expect(await getSentEvents(page)).toEqual([leftEvent])
    await expect(left).not.toContainClass('fcitx-keyboard-pressed')
  })
}

test('A replacement touch starts its own repeat delay', async ({ page }) => {
  const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
  const old = await touchDown(left)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toEqual([leftEvent])
  const fresh = await touchDown(left)
  await page.clock.runFor(300)
  expect(await getSentEvents(page)).toEqual([leftEvent])
  await page.clock.runFor(80)
  expect(await getSentEvents(page)).toEqual([leftEvent, leftEvent])
  await touchUp(left, old)
  await touchUp(left, fresh)
  await page.clock.runFor(400)
  expect(await getSentEvents(page)).toEqual([leftEvent, leftEvent])
})

test('Another arrow still replaces the single repeat owner', async ({ page }) => {
  const buttons = page.locator('.fcitx-keyboard-editor-button-container')
  const old = await touchDown(buttons.nth(0))
  await page.clock.runFor(380)
  const fresh = await touchDown(buttons.nth(2))
  await touchUp(buttons.nth(0), old)
  await page.clock.runFor(380)
  await touchUp(buttons.nth(2), fresh)
  expect(await getSentEvents(page)).toEqual([
    leftEvent,
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowRight' },
    },
  ])
})

test('A queued repeat cannot act on a new touch with a reused identifier', async ({ page }) => {
  const queued = await captureTimer(page, 'setInterval')
  const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
  const id = await touchDown(left)
  await page.clock.runFor(300)
  expect(await queued.evaluate(callbacks => callbacks.length)).toBe(1)
  await touchUp(left, id)
  await touchDownWithId(left, id)
  await queued.evaluate(callbacks => callbacks[0]())
  expect(await getSentEvents(page)).toEqual([])
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toEqual([leftEvent])
  await touchUp(left, id)
  await queued.dispose()
})

test('A queued long press cannot arm a new touch with a reused identifier', async ({ page }) => {
  const queued = await captureTimer(page, 'setTimeout')
  const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
  const id = await touchDown(left)
  expect(await queued.evaluate(callbacks => callbacks.length)).toBe(1)
  await touchUp(left, id)
  expect(await getSentEvents(page)).toEqual([leftEvent])
  await touchDownWithId(left, id)
  await queued.evaluate(callbacks => callbacks[0]())
  await page.clock.runFor(80)
  expect(await getSentEvents(page)).toEqual([leftEvent])
  await page.clock.runFor(300)
  expect(await getSentEvents(page)).toEqual([leftEvent, leftEvent])
  await touchUp(left, id)
  await queued.dispose()
})

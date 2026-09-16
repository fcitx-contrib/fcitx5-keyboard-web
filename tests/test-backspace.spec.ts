import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, GRAY, init, touchDown, touchMove, touchUp, WHITE } from './util'

test('Backspace', async ({ page }) => {
  await init(page)

  const backspace = page.locator('.fcitx-keyboard-backspace')
  await expect(backspace).toHaveCSS('background-color', GRAY)

  const touchId = await touchDown(backspace)
  await expect(backspace).toHaveCSS('background-color', WHITE)

  await touchUp(backspace, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '', code: 'Backspace' },
  }])
  await expect(backspace).toHaveCSS('background-color', GRAY)
})

test('Slide', async ({ page }) => {
  await init(page)

  const backspace = page.locator('.fcitx-keyboard-backspace')
  const touchId = await touchDown(backspace)
  await touchMove(backspace, touchId, -25, 0)
  await expect(backspace).toHaveCSS('background-color', WHITE)
  await touchMove(backspace, touchId, 15, 0)
  await touchUp(backspace, touchId)
  await expect(backspace).toHaveCSS('background-color', GRAY)

  const leftEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'LEFT' }
  const rightEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'RIGHT' }
  const releaseEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'RELEASE' }
  expect(await getSentEvents(page)).toEqual([
    leftEvent,
    leftEvent,
    rightEvent,
    releaseEvent,
  ])
})

for (const cancel of [false, true]) {
  test(`Long press stops on touch${cancel ? 'cancel' : 'end'}`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)

    const backspace = page.locator('.fcitx-keyboard-backspace')
    const touchId = await touchDown(backspace)
    await page.clock.runFor(300)
    expect(await getSentEvents(page)).toEqual([])

    await page.clock.runFor(80 * 3)
    expect(await getSentEvents(page)).toEqual(Array.from({ length: 3 }, () => ({
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    })))
    await expect(backspace).toHaveCSS('background-color', WHITE)
    await expect(page.locator('.fcitx-keyboard-popover')).toBeHidden()

    await touchMove(backspace, touchId, -25, 0)
    await page.clock.runFor(80)
    expect(await getSentEvents(page)).toHaveLength(4)

    await touchUp(backspace, touchId, cancel)
    await page.clock.runFor(500)
    expect(await getSentEvents(page)).toHaveLength(4)
    await expect(backspace).toHaveCSS('background-color', GRAY)
  })
}

test('Slide cancels long press', async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const backspace = page.locator('.fcitx-keyboard-backspace')
  const touchId = await touchDown(backspace)
  await touchMove(backspace, touchId, -25, 0)
  await page.clock.runFor(1000)
  await touchUp(backspace, touchId)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
  ])
})

test('Another key stops repeated backspace', async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const backspace = page.locator('.fcitx-keyboard-backspace')
  const touchId = await touchDown(backspace)
  await page.clock.runFor(380)
  const q = getKey(page, 'q')
  const qTouchId = await touchDown(q)
  await touchUp(q, qTouchId)
  await page.clock.runFor(500)
  await touchUp(backspace, touchId)
  await page.clock.runFor(500)
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: 'q', code: 'KeyQ' } },
  ])
})

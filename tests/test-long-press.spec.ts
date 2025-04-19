import { expect, test } from '@playwright/test'
import { getSentEvents, init, longPress, tap, touchMove } from './util'

test('Long press', async ({ page }) => {
  await init(page)

  const l = page.getByText('l)')
  await longPress(l)
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: ')', code: '' } },
  ])
})

test('Slide right', async ({ page }) => {
  await init(page)

  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  const period = page.getByText('.\\')
  await longPress(period, async (touchId) => {
    await expect(highlightedPopover).toHaveText('\\')
    await touchMove(period, touchId, page.viewportSize()!.width / 10, 0)
    return expect(highlightedPopover).toHaveText('>')
  })
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: '>', code: '' } },
  ])
})

test('Slide left after shift', async ({ page }) => {
  await init(page)

  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  const l = page.getByText('l)')
  await longPress(l, async (touchId) => {
    await expect(highlightedPopover).toHaveText(')')
    await touchMove(l, touchId, -page.viewportSize()!.width / 10 * 3, 0)
    return expect(highlightedPopover).toHaveText('l')
  })
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: 'l', code: 'KeyL' } },
  ])
})

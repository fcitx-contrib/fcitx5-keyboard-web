import test, { expect } from '@playwright/test'
import { getSentEvents, init, tap, touchDown, touchMove, touchUp } from './util'

test('Swipe up', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  await expect(popover).not.toBeVisible()

  const y = page.getByText('y6')
  const touchId = await touchDown(y)
  await touchMove(y, touchId, 5, -15)
  await expect(popover).toBeVisible()
  await expect(popover).toHaveText('6')

  await touchUp(y, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '6', code: 'Digit6' },
  }])
})

test('Cancel', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  const t = page.getByText('t5')
  const touchId = await touchDown(t)
  await touchMove(t, touchId, 5, -15)
  await expect(popover).toBeVisible()

  await touchMove(t, touchId, 0, 15)
  await expect(popover).not.toBeVisible()
  await touchUp(t, touchId)
  expect(await getSentEvents(page)).toEqual([])
})

test('Reset layer', async ({ page }) => {
  await init(page)

  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  const h = page.getByText('h/')
  await expect(h).toHaveText('H/')
  const touchId = await touchDown(h)
  await touchMove(h, touchId, 0, -10)
  await touchUp(h, touchId)
  await expect(h).toHaveText('h/')
})

test('Interrupted', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  const i = page.getByText('i8')
  const y = page.getByText('y6')
  const touchId = await touchDown(y)
  await touchMove(y, touchId, 5, -15)
  await touchDown(i)
  await expect(popover).not.toBeVisible()

  await touchUp(y, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'i', code: 'KeyI' },
  }])
})

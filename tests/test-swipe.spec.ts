import test, { expect } from '@playwright/test'
import { getSentEvents, init, touchDown, touchMove, touchUp } from './util'

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

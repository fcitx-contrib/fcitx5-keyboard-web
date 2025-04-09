import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { getSentEvents, GRAY, init, touchDown, touchMove, touchUp, WHITE } from './util'

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

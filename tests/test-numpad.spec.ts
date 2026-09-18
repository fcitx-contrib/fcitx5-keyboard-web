import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, init, tap, tapReturn, touchDown, touchMove, touchUp } from './util'

function getSymbolButton(page: Page) {
  return page.locator('.fcitx-keyboard-symbol')
}

function getNumpad(page: Page) {
  return page.locator('.fcitx-keyboard-numpad')
}

test('Swipe up on symbol opens numpad', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await expect(symbolButton.locator('.fcitx-keyboard-sub-label')).toHaveText('123')

  const touchId = await touchDown(symbolButton)
  await touchMove(symbolButton, touchId, 0, -20)
  await expect(page.locator('.fcitx-keyboard-popover')).toHaveText('123')
  await touchUp(symbolButton, touchId)

  await expect(getNumpad(page)).toBeVisible()
  await tapReturn(page)
  await expect(getKey(page, 'q')).toBeVisible()
})

test('Long press symbol opens numpad', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  const touchId = await touchDown(symbolButton)
  await page.waitForTimeout(400)
  await expect(page.locator('.fcitx-keyboard-popover')).toHaveText('123')
  await touchUp(symbolButton, touchId)

  await expect(getNumpad(page)).toBeVisible()
})

test('Numpad commits keys', async ({ page }) => {
  await init(page)

  await tap(page.locator('.fcitx-keyboard-shift'))
  const symbolButton = getSymbolButton(page)
  const touchId = await touchDown(symbolButton)
  await touchMove(symbolButton, touchId, 0, -20)
  await touchUp(symbolButton, touchId)

  const numpad = getNumpad(page)
  await expect(numpad.locator('.fcitx-keyboard-row')).toHaveCount(4)
  await tap(numpad.getByText('+', { exact: true }))
  await tap(numpad.getByText('1', { exact: true }))
  await tap(numpad.getByText('0', { exact: true }))
  await tap(numpad.locator('.fcitx-keyboard-numpad-space'))
  await tap(numpad.getByText('.', { exact: true }))
  await tap(numpad.locator('.fcitx-keyboard-numpad-backspace'))
  await tap(numpad.locator('.fcitx-keyboard-numpad-enter'))

  expect(await getSentEvents(page)).toEqual([
    { type: 'COMMIT', data: '+' },
    { type: 'COMMIT', data: '1' },
    { type: 'COMMIT', data: '0' },
    { type: 'COMMIT', data: ' ' },
    { type: 'COMMIT', data: '.' },
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: '\r', code: 'Enter' } },
  ])
  await tapReturn(page)
  await expect(getKey(page, 'q1')).toBeVisible()
})

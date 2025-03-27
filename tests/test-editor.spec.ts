import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, getToolbarButton, init, sendSystemEvent, tapReturn } from './util'

function gotoEditor(page: Page) {
  return getToolbarButton(page, 3).tap()
}

function getSelectButton(page: Page) {
  return page.locator('.fcitx-keyboard-editor-button-container').nth(4)
}

test('Basic keys', async ({ page }) => {
  await init(page)

  await gotoEditor(page)
  for (const locator of await page.locator('.fcitx-keyboard-editor-button-container').all()) {
    await locator.tap()
  }
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowLeft' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowUp' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowRight' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowDown' } },
    { type: 'SELECT' },
    { type: 'CUT' },
    { type: 'COPY' },
    { type: 'PASTE' },
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'Home' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'End' } },
  ])
})

test('Select (all)', async ({ page }) => {
  await init(page)

  await gotoEditor(page)
  const selectButton = getSelectButton(page)
  const selectAllOrCutButton = page.locator('.fcitx-keyboard-editor-button-container').nth(5)

  await expect(selectButton).not.toHaveClass(/fcitx-keyboard-pressed/)
  await expect(selectAllOrCutButton).toHaveText('Select all')

  await selectAllOrCutButton.tap()
  await selectButton.tap()
  await expect(selectButton).toHaveClass(/fcitx-keyboard-pressed/)
  await expect(selectAllOrCutButton).toHaveText('Cut')

  await selectButton.tap()
  await expect(selectButton).not.toHaveClass(/fcitx-keyboard-pressed/)
  await expect(selectAllOrCutButton).toHaveText('Select all')

  expect(await getSentEvents(page)).toEqual([
    { type: 'SELECT_ALL' },
    { type: 'SELECT' },
    { type: 'DESELECT' },
  ])
})

test('Select controlled by system', async ({ page }) => {
  await init(page)

  const selectButton = getSelectButton(page)
  await sendSystemEvent(page, { type: 'SELECT' })
  await expect(selectButton).toHaveClass(/fcitx-keyboard-pressed/)

  await sendSystemEvent(page, { type: 'DESELECT' })
  await expect(selectButton).not.toHaveClass(/fcitx-keyboard-pressed/)
})

test('Return', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await gotoEditor(page)
  await expect(q).not.toBeVisible()

  await tapReturn(page)
  await expect(q).toBeVisible()
})

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, getToolbarButton, init, returnInitial } from './util'

function gotoEditor(page: Page) {
  return getToolbarButton(page, 3).tap()
}

test('Basic keys', async ({ page }) => {
  await init(page)

  await gotoEditor(page)
  for (const locator of await page.locator('.fcitx-keyboard-editor-button').all()) {
    await locator.tap()
  }
  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowLeft' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowUp' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowRight' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'ArrowDown' } },
    { type: 'CUT' },
    { type: 'COPY' },
    { type: 'PASTE' },
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'Home' } },
    { type: 'KEY_DOWN', data: { key: '', code: 'End' } },
  ])
})

test('Return', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await gotoEditor(page)
  await expect(q).not.toBeVisible()

  await returnInitial(page)
  await expect(q).toBeVisible()
})

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, getToolbarButton, init, sendSystemEvent } from './util'

function gotoEditor(page: Page) {
  return getToolbarButton(page, 3).tap()
}

function returnInitial(page: Page) {
  return page.locator('.fcitx-keyboard-return-bar .fcitx-keyboard-toolbar-button').tap()
}

test('Basic keys', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await gotoEditor(page)
  await expect(q).not.toBeVisible()

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

  await returnInitial(page)
  await expect(q).toBeVisible()
})

test('Clear', async ({ page }) => {
  await init(page)

  await gotoEditor(page)
  await sendSystemEvent(page, { type: 'CLEAR' })
  await expect(getKey(page, 'q')).toBeVisible()
})

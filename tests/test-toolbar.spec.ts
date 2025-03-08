import { expect, test } from '@playwright/test'
import { getSentEvents, init } from './util'

test('Undo', async ({ page }) => {
  await init(page)

  const undo = page.locator('.fcitx-keyboard-toolbar-button:nth-child(1)')
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'UNDO',
  }])
})

test('Redo', async ({ page }) => {
  await init(page)

  const undo = page.locator('.fcitx-keyboard-toolbar-button:nth-child(2)')
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'REDO',
  }])
})

import { expect, test } from '@playwright/test'
import { getSentEvents, init, tap } from './util'

test('Tap', async ({ page }) => {
  await init(page)
  const globe = page.locator('.fcitx-keyboard-globe')
  await tap(globe)
  expect(await getSentEvents(page)).toEqual([{ type: 'GLOBE' }])
})

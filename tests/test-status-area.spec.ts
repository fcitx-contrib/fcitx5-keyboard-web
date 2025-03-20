import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, getToolbarButton, init, returnInitial, sendSystemEvent } from './util'

function gotoStatusArea(page: Page) {
  return getToolbarButton(page, 5).tap()
}

test('Simplified and traditional', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'STATUS_AREA', data: [{ desc: '简体中文', icon: 'fcitx-chttrans-inactive', id: 4 }] })
  await gotoStatusArea(page)

  const button = page.locator('.fcitx-keyboard-status-area-circle')
  await expect(button).toHaveText('简')

  await button.tap()
  expect(await getSentEvents(page)).toEqual([
    { type: 'STATUS_AREA_ACTION', data: 4 },
  ])

  await sendSystemEvent(page, { type: 'STATUS_AREA', data: [{ desc: '繁体中文', icon: 'fcitx-chttrans-active', id: 4 }] })
  await expect(button).toHaveText('繁')
})

test('Return', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await gotoStatusArea(page)
  await expect(q).not.toBeVisible()

  await returnInitial(page)
  await expect(q).toBeVisible()
})

import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getBox, getContainer, getKey, getSentEvents, getToolbarButton, init, sendSystemEvent, tapReturn } from './util'

function gotoStatusArea(page: Page) {
  return getToolbarButton(page, 6).tap()
}

test('Simplified and traditional', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, {
    type: 'STATUS_AREA',
    data: [{ desc: '简体中文', icon: 'fcitx-chttrans-inactive', id: 4 }],
  })
  await gotoStatusArea(page)

  const button = page.locator('.fcitx-keyboard-status-area-circle')
  await expect(button).toHaveText('简')

  await button.tap()
  expect(await getSentEvents(page)).toEqual([
    { type: 'STATUS_AREA_ACTION', data: 4 },
  ])

  await sendSystemEvent(page, {
    type: 'STATUS_AREA',
    data: [{ desc: '繁体中文', icon: 'fcitx-chttrans-active', id: 4 }],
  })
  await expect(button).toHaveText('繁')
})

test('Return', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await gotoStatusArea(page)
  await expect(q).not.toBeVisible()

  await tapReturn(page)
  await expect(q).toBeVisible()
})

test('Multiple actions: align bottom', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, {
    type: 'STATUS_AREA',
    data: [{ desc: '😁 → 😭', children: Array.from({ length: 5 }).map((_, i) => ({
      desc: `子项${i}`,
      icon: '',
      id: i,
    })), icon: '', id: -1 }],
  })
  await gotoStatusArea(page)

  const button = page.locator('.fcitx-keyboard-status-area-circle')
  await expect(button).toHaveText('😁')

  await button.tap()
  const contextmenu = page.locator('.fcitx-keyboard-contextmenu')
  await expect(contextmenu).toBeVisible()
  const box = await getBox(contextmenu)
  const containerBox = await getBox(getContainer(page))
  expect(box.y + box.height).toBeCloseTo(containerBox.y + containerBox.height, 1)
})

test('Many actions: align top', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, {
    type: 'STATUS_AREA',
    data: [{ desc: '有 → 无', children: Array.from({ length: 10 }).map((_, i) => ({
      desc: `子项${i}`,
      icon: '',
      id: i,
    })), icon: '', id: -1 }],
  })
  await gotoStatusArea(page)

  const button = page.locator('.fcitx-keyboard-status-area-circle')
  await expect(button).toHaveText('有')

  await button.tap()
  const contextmenu = page.locator('.fcitx-keyboard-contextmenu')
  await expect(contextmenu).toBeVisible()
  const box = await getBox(contextmenu)
  const containerBox = await getBox(getContainer(page))
  expect(box.y).toBeCloseTo(containerBox.y, 1)
  const lastItem = contextmenu.locator('.fcitx-keyboard-contextmenu-item').last()
  await expect(lastItem).not.toBeInViewport()

  await contextmenu.evaluate(element => element.scrollBy(0, element.scrollHeight))
  await expect(lastItem).toBeInViewport()
})

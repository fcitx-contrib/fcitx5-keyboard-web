import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, getToolbarButton, init, sendSystemEvent, tapReturn, touchDown, touchMove, touchUp } from './util'

function gotoEditor(page: Page) {
  return getToolbarButton(page, 4).tap()
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

test('Long press arrow keys', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await gotoEditor(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const buttons = page.locator('.fcitx-keyboard-editor-button-container')
  const codes = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']
  const expected = []
  for (const [index, code] of codes.entries()) {
    const button = buttons.nth(index)
    const touchId = await touchDown(button)
    await page.clock.runFor(300)
    expect(await getSentEvents(page)).toEqual(expected)

    await page.clock.runFor(80 * 3)
    expected.push(...Array.from({ length: 3 }, () => ({
      type: 'KEY_DOWN' as const,
      data: { key: '', code },
    })))
    expect(await getSentEvents(page)).toEqual(expected)

    await touchUp(button, touchId, code === 'ArrowDown')
    await page.clock.runFor(500)
    expect(await getSentEvents(page)).toEqual(expected)
  }
})

test('Leaving editor stops repeated arrow key', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await gotoEditor(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const left = page.locator('.fcitx-keyboard-editor-button-container').first()
  const touchId = await touchDown(left)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)

  await tapReturn(page)
  await page.clock.runFor(500)
  await touchUp(left, touchId)
  expect(await getSentEvents(page)).toHaveLength(1)
})

test('Dragging stops repeated arrow key', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await gotoEditor(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const left = page.locator('.fcitx-keyboard-editor-button-container').first()
  const touchId = await touchDown(left)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)

  await touchMove(left, touchId, 100, 0)
  await page.clock.runFor(500)
  await touchUp(left, touchId)
  expect(await getSentEvents(page)).toHaveLength(1)
})

test('Other touches do not stop repeated arrow key', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await gotoEditor(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)

  const left = page.locator('.fcitx-keyboard-editor-button-container').first()
  const touchId = await touchDown(left)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)

  await left.evaluate((element) => {
    const touch = new Touch({ identifier: 9999, target: element })
    for (const type of ['touchend', 'touchcancel']) {
      element.dispatchEvent(new TouchEvent(type, {
        touches: window.touches,
        changedTouches: [touch],
        bubbles: true,
      }))
    }
  })
  await page.clock.runFor(80 * 2)
  expect(await getSentEvents(page)).toHaveLength(3)

  await touchUp(left, touchId)
  await page.clock.runFor(500)
  expect(await getSentEvents(page)).toHaveLength(3)
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

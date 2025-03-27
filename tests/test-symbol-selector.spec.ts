import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent, tap, tapReturn } from './util'

function getSymbolButton(page: Page) {
  return page.getByText('#+=')
}

test('Commit', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  const symbol = page.getByText('ā')
  await symbol.tap()
  expect(await getSentEvents(page)).toEqual([
    { type: 'COMMIT', data: 'ā' },
  ])
})

test('Reset scroll state', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  const pinyin = page.getByText('pinyin')
  const greek = page.getByText('greek')
  await expect(pinyin).toHaveClass(/fcitx-keyboard-pressed/)
  await expect(greek).not.toHaveClass(/fcitx-keyboard-pressed/)

  const symbol = page.getByText('ā')
  const initialBox = (await symbol.boundingBox())!

  await page.evaluate(() => document.querySelector('.fcitx-keyboard-symbol-panel')?.scrollBy(0, 20))
  const intermediateBox = (await symbol.boundingBox())!
  expect(intermediateBox.y).toEqual(initialBox.y - 20)

  await page.getByText('greek').tap()
  await expect(pinyin).not.toHaveClass(/fcitx-keyboard-pressed/)
  await expect(greek).toHaveClass(/fcitx-keyboard-pressed/)

  await pinyin.tap()
  await expect(pinyin).toHaveClass(/fcitx-keyboard-pressed/)
  await expect(greek).not.toHaveClass(/fcitx-keyboard-pressed/)
  const finalBox = (await symbol.boundingBox())!
  expect(finalBox.y).toEqual(initialBox.y)
})

test('Reset category', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  const greek = page.getByText('greek')
  await greek.tap()
  await tapReturn(page)
  await tap(symbolButton)
  await expect(greek).not.toHaveClass(/fcitx-keyboard-pressed/)
})

test('Return doesn\'t clear candidates', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [
      { text: '一', label: '1', comment: '' },
    ],
    highlighted: 0,
  } })
  const candidate = page.locator('.fcitx-keyboard-candidate')
  await expect(candidate).toBeVisible()

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  await expect(candidate).not.toBeVisible()

  await tapReturn(page)
  await expect(candidate).toBeVisible()
})

test('Return to see button released', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  await tapReturn(page)
  await expect(symbolButton).not.toHaveClass(/fcitx-keyboard-pressed/)
})

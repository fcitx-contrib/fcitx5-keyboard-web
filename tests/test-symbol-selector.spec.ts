import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getBox, getKey, getSentEvents, GRAY, init, sendSystemEvent, tap, tapReturn, touchDown, touchUp, WHITE } from './util'

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

test('Lock', async ({ page }) => {
  await init(page)
  const lock = page.locator('.fcitx-keyboard-symbol-lock')
  await expect(lock).toBeHidden()

  await tap(getSymbolButton(page))
  await expect(lock).toBeVisible()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')

  await lock.tap()
  await expect(lock).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('ā').tap()
  await expect(page.getByText('á')).toBeVisible()

  await tapReturn(page)
  await tap(getSymbolButton(page))
  await expect(lock).toHaveAttribute('aria-pressed', 'true')

  await lock.tap()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
  await page.getByText('á').tap()
  await expect(getKey(page, 'q')).toBeVisible()
  expect(await getSentEvents(page)).toEqual([
    { type: 'COMMIT', data: 'ā' },
    { type: 'COMMIT', data: 'á' },
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
  const initialBox = await getBox(symbol)

  await page.evaluate(() => document.querySelector('.fcitx-keyboard-symbol-panel')?.scrollBy(0, 20))
  const intermediateBox = await getBox(symbol)
  expect(intermediateBox.y).toEqual(initialBox.y - 20)

  await page.getByText('greek').tap()
  await expect(pinyin).not.toHaveClass(/fcitx-keyboard-pressed/)
  await expect(greek).toHaveClass(/fcitx-keyboard-pressed/)

  await pinyin.tap()
  await expect(pinyin).toHaveClass(/fcitx-keyboard-pressed/)
  await expect(greek).not.toHaveClass(/fcitx-keyboard-pressed/)
  const finalBox = await getBox(symbol)
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

async function renderCandidateAndClickSymbol(page: Page) {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    inputContext: 'context',
    generation: 1,
    candidates: [
      { text: '一', label: '1', comment: '' },
    ],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
    hasClientPreedit: true,
    tabActions: [],
  } })
  const candidate = page.locator('.fcitx-keyboard-candidate')
  await expect(candidate).toBeVisible()

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  await expect(candidate).not.toBeVisible()
  return candidate
}

test('Commit and clear candidates', async ({ page }) => {
  const candidate = await renderCandidateAndClickSymbol(page)

  await page.getByText('ā').tap()
  await sendSystemEvent(page, { type: 'CLEAR' })
  await expect(getKey(page, 'q'), 'Should return to keyboard on clear').toBeVisible()
  await expect(candidate).not.toBeVisible()
})

test('Return doesn\'t clear candidates', async ({ page }) => {
  const candidate = await renderCandidateAndClickSymbol(page)

  await tapReturn(page)
  await expect(candidate).toBeVisible()
})

for (const type of ['CLEAR', 'HIDE'] as const) {
  test(`${type} while in symbol resets return mode`, async ({ page }) => {
    const candidate = await renderCandidateAndClickSymbol(page)

    await sendSystemEvent(page, { type })
    await expect(page.getByText('ā')).toBeVisible()

    await tapReturn(page)
    await expect(getKey(page, 'q')).toBeVisible()
    await expect(candidate).not.toBeVisible()
    await expect(page.locator('.fcitx-keyboard-toolbar')).toBeVisible()
  })
}

test('Return to see all keys released', async ({ page }) => {
  await init(page)

  const k = getKey(page, 'k')
  await touchDown(k)

  const symbolButton = getSymbolButton(page)
  await tap(symbolButton)
  await tapReturn(page)
  await expect(k).toHaveCSS('background-color', WHITE)
  await expect(symbolButton).toHaveCSS('background-color', GRAY)
})

for (const longPress of [false, true]) {
  test(`Backspace ${longPress ? 'long press' : 'tap'} preserves symbol mode`, async ({ page }) => {
    await init(page)
    await tap(getSymbolButton(page))

    const backspace = page.locator('.fcitx-keyboard-return-backspace')
    const touchId = await touchDown(backspace)
    if (longPress) {
      await page.waitForTimeout(400)
    }
    else {
      await touchUp(backspace, touchId)
    }

    await sendSystemEvent(page, { type: 'PREEDIT', data: {
      auxUp: '',
      preedit: '',
      caret: 0,
    } })
    await sendSystemEvent(page, { type: 'CANDIDATES', data: {
      inputContext: 'context',
      generation: 1,
      candidates: [],
      highlighted: -1,
      scrollState: SCROLL_NONE,
      scrollStart: true,
      scrollEnd: true,
      hasClientPreedit: false,
      tabActions: [],
    } })

    await expect(page.getByText('ā')).toBeVisible()
    await expect(backspace).toBeVisible()
    if (longPress) {
      await touchUp(backspace, touchId)
    }
  })
}

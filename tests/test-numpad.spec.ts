import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getKey, getSentEvents, init, sendSystemEvent, tap, tapReturn, touchDown, touchMove, touchUp } from './util'

function getSymbolButton(page: Page) {
  return page.locator('.fcitx-keyboard-symbol')
}

function getNumpad(page: Page) {
  return page.locator('.fcitx-keyboard-numpad')
}

async function openNumpad(page: Page) {
  const symbolButton = getSymbolButton(page)
  const touchId = await touchDown(symbolButton)
  await touchMove(symbolButton, touchId, 0, -20)
  await touchUp(symbolButton, touchId)
  await expect(getNumpad(page)).toBeVisible()
  const toolbar = page.locator('.fcitx-keyboard-toolbar')
  await expect(toolbar).toContainClass('fcitx-keyboard-numpad-mode')
}

test('Swipe up on symbol opens numpad', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  await expect(symbolButton.locator('.fcitx-keyboard-sub-label')).toHaveText('123')

  const touchId = await touchDown(symbolButton)
  await touchMove(symbolButton, touchId, 0, -20)
  await expect(page.locator('.fcitx-keyboard-popover')).toHaveText('123')
  await touchUp(symbolButton, touchId)

  await expect(getNumpad(page)).toBeVisible()
  await tapReturn(page)
  await expect(getKey(page, 'q')).toBeVisible()
})

test('Long press symbol opens numpad', async ({ page }) => {
  await init(page)

  const symbolButton = getSymbolButton(page)
  const touchId = await touchDown(symbolButton)
  await page.waitForTimeout(400)
  await expect(page.locator('.fcitx-keyboard-popover')).toHaveText('123')
  await touchUp(symbolButton, touchId)

  await expect(getNumpad(page)).toBeVisible()
})

test('Return cancels a pending numpad key', async ({ page }) => {
  await init(page)
  await openNumpad(page)

  const one = getNumpad(page).getByText('1', { exact: true })
  const oneTouchId = await touchDown(one)
  await tapReturn(page)
  expect(await getSentEvents(page)).toEqual([])

  await touchUp(one, oneTouchId)
  expect(await getSentEvents(page)).toEqual([])
})

test('Numpad commits keys', async ({ page }) => {
  await init(page)

  await tap(page.locator('.fcitx-keyboard-shift'))
  await openNumpad(page)

  const numpad = getNumpad(page)
  await expect(numpad.locator('.fcitx-keyboard-row')).toHaveCount(4)
  await tap(numpad.getByText('+', { exact: true }))
  await tap(numpad.getByText('1', { exact: true }))
  await tap(numpad.getByText('0', { exact: true }))
  await tap(numpad.locator('.fcitx-keyboard-numpad-space'))
  await tap(numpad.getByText('.', { exact: true }))
  await tap(numpad.locator('.fcitx-keyboard-numpad-backspace'))
  await tap(numpad.locator('.fcitx-keyboard-numpad-enter'))

  expect(await getSentEvents(page)).toEqual([
    { type: 'COMMIT', data: '+' },
    { type: 'COMMIT', data: '1' },
    { type: 'COMMIT', data: '0' },
    { type: 'COMMIT', data: ' ' },
    { type: 'COMMIT', data: '.' },
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: '\r', code: 'Enter' } },
  ])
  await tapReturn(page)
  await expect(getKey(page, 'q1')).toBeVisible()
})

test('Numpad shows toolbar buttons', async ({ page }) => {
  await init(page)
  await openNumpad(page)

  const toolbarButtons = page.locator('.fcitx-keyboard-toolbar .fcitx-keyboard-toolbar-button:visible')
  await expect(toolbarButtons).toHaveCount(7)
})

test('Edit button on numpad opens editor and returns to numpad', async ({ page }) => {
  await init(page)
  await openNumpad(page)

  const editButton = page.locator('.fcitx-keyboard-toolbar .fcitx-keyboard-toolbar-button:visible').nth(3)
  await editButton.tap()
  await expect(page.locator('.fcitx-keyboard-editor')).toBeVisible()
  await expect(getNumpad(page)).toBeHidden()

  await tapReturn(page)
  await expect(getNumpad(page)).toBeVisible()
  await expect(page.locator('.fcitx-keyboard-editor')).toBeHidden()
})

test('Status area button on numpad opens status area and returns to numpad', async ({ page }) => {
  await init(page)
  await openNumpad(page)

  const statusAreaButton = page.locator('.fcitx-keyboard-toolbar .fcitx-keyboard-toolbar-button:visible').nth(5)
  await statusAreaButton.tap()
  await expect(page.locator('.fcitx-keyboard-status-area')).toBeVisible()
  await expect(getNumpad(page)).toBeHidden()

  await tapReturn(page)
  await expect(getNumpad(page)).toBeVisible()
  await expect(page.locator('.fcitx-keyboard-status-area')).toBeHidden()
})

for (const { name, buttonIndex, surface } of [
  { name: 'editor', buttonIndex: 3, surface: '.fcitx-keyboard-editor' },
  { name: 'status area', buttonIndex: 5, surface: '.fcitx-keyboard-status-area' },
]) {
  test(`Numpad returns to initial mode after opening ${name} from candidates`, async ({ page }) => {
    await init(page)
    await sendSystemEvent(page, { type: 'CANDIDATES', data: {
      inputContext: 'context',
      generation: 1,
      candidates: [{ text: '一', label: '1', comment: '' }],
      highlighted: 0,
      scrollState: SCROLL_NONE,
      scrollStart: false,
      scrollEnd: false,
      hasClientPreedit: true,
      tabActions: [],
    } })
    await expect(page.locator('.fcitx-keyboard-candidates')).toBeVisible()

    await openNumpad(page)
    expect(await getSentEvents(page)).toEqual([{ type: 'COMMIT', data: '' }])
    const toolbarButton = page.locator('.fcitx-keyboard-toolbar .fcitx-keyboard-toolbar-button:visible').nth(buttonIndex)
    await toolbarButton.tap()
    await expect(page.locator(surface)).toBeVisible()

    await tapReturn(page)
    await expect(getNumpad(page)).toBeVisible()
    await tapReturn(page)
    await expect(getKey(page, 'q')).toBeVisible()
    await expect(page.locator('.fcitx-keyboard-candidates')).toBeHidden()
  })
}

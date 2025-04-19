import { expect, test } from '@playwright/test'
import { getSentEvents, init, longPress, sendSystemEvent, tap } from './util'

test('Tap', async ({ page }) => {
  await init(page)

  const globe = page.locator('.fcitx-keyboard-globe')
  await tap(globe)
  expect(await getSentEvents(page)).toEqual([{ type: 'GLOBE' }])
})

test('Long press', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'INPUT_METHODS', data: {
    currentInputMethod: 'pinyin',
    inputMethods: [
      { name: 'keyboard-us', displayName: 'English' },
      { name: 'pinyin', displayName: '拼音' },
    ],
  } })
  const globe = page.locator('.fcitx-keyboard-globe')
  await longPress(globe)
  const contextmenu = page.locator('.fcitx-keyboard-contextmenu')
  const english = contextmenu.getByText('English')
  const pinyin = contextmenu.getByText('拼音')
  await expect(english).toBeVisible()
  await expect(pinyin).toBeVisible()

  await english.tap()
  await expect(contextmenu).not.toBeVisible()
  expect(await getSentEvents(page)).toEqual([{ type: 'SET_INPUT_METHOD', data: 'keyboard-us' }])
})

test('Interrupted', async ({ page }) => {
  await init(page)

  const contextmenu = page.locator('.fcitx-keyboard-contextmenu')
  await sendSystemEvent(page, { type: 'INPUT_METHODS', data: {
    currentInputMethod: 'pinyin',
    inputMethods: [
      { name: 'keyboard-us', displayName: 'English' },
    ],
  } })
  const globe = page.locator('.fcitx-keyboard-globe')
  await longPress(globe)
  await expect(contextmenu.getByText('English')).toBeVisible()
  await page.locator('.fcitx-keyboard-contextmenu-container').tap()
  await expect(contextmenu).not.toBeVisible()
})

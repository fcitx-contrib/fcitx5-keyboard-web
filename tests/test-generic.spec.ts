import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, GRAY, init, sendSystemEvent, tap, tapReturn, touchDown, touchUp, WHITE } from './util'

function getNumpad(page: Page) {
  return page.locator('.fcitx-keyboard-numpad')
}

test('Click', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  await expect(q).toHaveCSS('background-color', WHITE)

  const touchId = await touchDown(q)
  expect(await getSentEvents(page), 'To support other gestures, no event should be sent on press.').toEqual([])
  await expect(q).toHaveCSS('background-color', GRAY)

  await touchUp(q, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }])
  await expect(q).toHaveCSS('background-color', WHITE)
})

test('Touch canceled', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q')
  const touchId = await touchDown(q)
  await touchUp(q, touchId, true)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }])
  await expect(q).toHaveCSS('background-color', WHITE)
})

test('Enter', async ({ page }) => {
  await init(page)

  const enter = page.locator('.fcitx-keyboard-enter')
  const svg = enter.locator('svg')
  const enterSvg = await svg.innerHTML()

  await tap(enter)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '\r', code: 'Enter' },
  }])

  await sendSystemEvent(page, { type: 'ENTER_KEY_TYPE', data: 'search' })
  const searchSvg = await svg.innerHTML()
  expect(enterSvg).not.toEqual(searchSvg)
})

test('Preserve press order', async ({ page }) => {
  await init(page)

  const w = getKey(page, 'w')
  await expect(w).toHaveCSS('background-color', WHITE)

  const o = getKey(page, 'o')
  await expect(o).toHaveCSS('background-color', WHITE)

  const wTouchId = await touchDown(w)
  await expect(w).toHaveCSS('background-color', GRAY)

  const oTouchId = await touchDown(o)
  await expect(o).toHaveCSS('background-color', GRAY)

  await touchUp(o, oTouchId)
  await touchUp(w, wTouchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'w', code: 'KeyW' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'o', code: 'KeyO' },
  }])
  await expect(w).toHaveCSS('background-color', WHITE)
  await expect(o).toHaveCSS('background-color', WHITE)
})

test('HIDE event', async ({ page }) => {
  await init(page)

  const q = getKey(page, 'q1')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(q).toHaveText('Q1')

  await sendSystemEvent(page, { type: 'HIDE' })
  await expect(q).toHaveText('q1')
})

test('Number input type opens numpad', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'number' })

  const numpad = getNumpad(page)
  await expect(numpad).toBeVisible()
  await expect(numpad.locator('.fcitx-keyboard-row')).toHaveCount(4)

  await tap(numpad.getByText('1', { exact: true }))
  await tap(numpad.getByText('2', { exact: true }))
  await tap(numpad.getByText('3', { exact: true }))

  expect(await getSentEvents(page)).toEqual([
    { type: 'COMMIT', data: '1' },
    { type: 'COMMIT', data: '2' },
    { type: 'COMMIT', data: '3' },
  ])

  await tapReturn(page)
  await expect(getKey(page, 'q')).toBeVisible()
})

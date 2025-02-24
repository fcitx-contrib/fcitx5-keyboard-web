import {
  expect,
  test,
} from '@playwright/test'
import { getSentEvents, GRAY, init, sendSystemEvent, tap, touchDown, touchUp, WHITE } from './util'

test('Click', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  await expect(q).toHaveCSS('background-color', WHITE)

  const touchId = await touchDown(q)
  expect(await getSentEvents(page), 'To support other gestures, no event should be sent on press.').toEqual([])
  await expect(q).toHaveCSS('background-color', GRAY)

  await touchUp(q, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'q', code: '' },
  }])
  await expect(q).toHaveCSS('background-color', WHITE)
})

test('Backspace', async ({ page }) => {
  await init(page)

  const backspace = page.locator('.fcitx-keyboard-backspace')
  await expect(backspace).toHaveCSS('background-color', GRAY)

  const touchId = await touchDown(backspace)
  await expect(backspace).toHaveCSS('background-color', WHITE)

  await touchUp(backspace, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '', code: 'Backspace' },
  }])
  await expect(backspace).toHaveCSS('background-color', GRAY)
})

test('Enter', async ({ page }) => {
  await init(page)

  const enter = page.locator('.fcitx-keyboard-enter')
  await expect(enter.locator('svg')).toBeVisible()

  await tap(enter)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '\r', code: 'Enter' },
  }])

  await sendSystemEvent(page, { type: 'ENTER_KEY_TYPE', data: '搜索' })
  await expect(enter).toHaveText('搜索')
})

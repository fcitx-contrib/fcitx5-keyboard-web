import {
  expect,
  test,
} from '@playwright/test'
import { getSentEvents, GRAY, init, sendSystemEvent, tap, WHITE } from './util'

test('Click', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  await expect(q).toHaveCSS('background-color', WHITE)

  await q.dispatchEvent('touchstart')
  expect(await getSentEvents(page), 'To support other gestures, no event should be sent on press.').toEqual([])
  await expect(q).toHaveCSS('background-color', GRAY)

  await q.dispatchEvent('touchend')
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

  await backspace.dispatchEvent('touchstart')
  await expect(backspace).toHaveCSS('background-color', WHITE)

  await backspace.dispatchEvent('touchend')
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

test('Shift', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(q).toHaveText('Q')

  await tap(q)
  expect(await getSentEvents(page), '').toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'Q', code: '' },
  }])

  await expect(q).toHaveText('q')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toHaveLength(2)
  expect(sentEvents[1]).toEqual({
    type: 'KEY_DOWN',
    data: { key: 'q', code: '' },
  })
})

test('Shift locked', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(shift)
  await expect(q).toHaveText('Q')

  await tap(q)
  await tap(q)
  await expect(q).toHaveText('Q')

  await tap(shift)
  await expect(q).toHaveText('q')

  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'Q', code: '' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'Q', code: '' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'q', code: '' },
  }])
})

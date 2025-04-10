import { expect, test } from '@playwright/test'
import { getSentEvents, init, tap, touchDown, touchUp } from './util'

test('Shift', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(q).toHaveText('Q')

  await tap(q)
  expect(await getSentEvents(page), '').toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }])

  await expect(q).toHaveText('q')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toHaveLength(2)
  expect(sentEvents[1]).toEqual({
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  })
})

test('Shift hold', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  const shift = page.locator('.fcitx-keyboard-shift')
  const touchId = await touchDown(shift)
  await expect(q).toHaveText('Q')

  await tap(q)
  await tap(q)

  await touchUp(shift, touchId)
  await expect(q).toHaveText('q')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }])
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
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }])
})

test('Shift interrupted', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(q)
  await tap(shift)

  await expect(q).toHaveText('Q')
  await tap(q)
  await expect(q).toHaveText('q')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'Q', code: 'KeyQ' },
  }, {
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }])
})

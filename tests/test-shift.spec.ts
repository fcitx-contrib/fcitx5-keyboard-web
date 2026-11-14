import { expect, test } from '@playwright/test'
import { getSentEvents, init, tap, touchDown, touchUp } from './util'

test('Shift', async ({ page }) => {
  await init(page)

  const q = page.getByText('q1')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(q).toHaveText('Q1')

  await tap(q)
  expect(await getSentEvents(page), '').toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
  ])

  await expect(q).toHaveText('q1')
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

  const q = page.getByText('q1')
  const shift = page.locator('.fcitx-keyboard-shift')
  const touchId = await touchDown(shift)
  await expect(q).toHaveText('Q1')

  await tap(q)
  await tap(q)

  await touchUp(shift, touchId)
  await expect(q).toHaveText('q1')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'q', code: 'KeyQ' },
    },
  ])
})

test('Shift locked', async ({ page }) => {
  await init(page)

  const q = page.getByText('q1')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(shift)
  await expect(q).toHaveText('Q1')

  await tap(q)
  await tap(q)
  await expect(q).toHaveText('Q1')

  await tap(shift)
  await expect(q).toHaveText('q1')

  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'q', code: 'KeyQ' },
    },
  ])
})

for (const taps of [3, 4, 5, 6]) {
  test(`${taps} rapid Shift taps consume consecutive double-tap pairs`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const shift = page.locator('.fcitx-keyboard-shift')
    const q = page.getByText('q1')
    for (let i = 0; i < taps; ++i) {
      await tap(shift)
      await page.clock.runFor(50)
    }
    const locked = taps % 2 === 0
    await expect(q).toHaveText(locked ? 'Q1' : 'q1')
    await tap(q)
    await tap(q)
    expect(await getSentEvents(page)).toEqual(Array.from({ length: 2 }, () => ({
      type: 'KEY_DOWN',
      data: {
        key: locked ? 'Q' : 'q',
        code: 'KeyQ',
      },
    })))
  })
}

for (const interval of [299, 300]) {
  test(`Shift double tap uses the strict iOS 300ms boundary (${interval}ms)`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const shift = page.locator('.fcitx-keyboard-shift')
    const q = page.getByText('q1')
    await tap(shift)
    await page.clock.runFor(interval)
    await tap(shift)
    const locked = interval < 300
    await expect(q).toHaveText(locked ? 'Q1' : 'q1')
    await tap(q)
    await tap(q)
    expect(await getSentEvents(page)).toEqual(Array.from({ length: 2 }, () => ({
      type: 'KEY_DOWN',
      data: {
        key: locked ? 'Q' : 'q',
        code: 'KeyQ',
      },
    })))
  })
}

test('Shift interrupted', async ({ page }) => {
  await init(page)

  const q = page.getByText('q1')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(q)
  await tap(shift)

  await expect(q).toHaveText('Q1')
  await tap(q)
  await expect(q).toHaveText('q1')
  await tap(q)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'Q', code: 'KeyQ' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'q', code: 'KeyQ' },
    },
  ])
})

import { expect, test } from '@playwright/test'
import { getSentEvents, init, tap, touchDown, touchUp } from './util'

test('Shift', async ({ page }) => {
  await init(page)

  const k = page.getByText('k(')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(k).toHaveText('K(')

  await tap(k)
  expect(await getSentEvents(page), '').toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
  ])

  await expect(k).toHaveText('k(')
  await tap(k)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toHaveLength(2)
  expect(sentEvents[1]).toEqual({
    type: 'KEY_DOWN',
    data: { key: 'k', code: 'KeyK' },
  })
})

test('Shift hold', async ({ page }) => {
  await init(page)

  const k = page.getByText('k(')
  const shift = page.locator('.fcitx-keyboard-shift')
  const touchId = await touchDown(shift)
  await expect(k).toHaveText('K(')

  await tap(k)
  await tap(k)

  await touchUp(shift, touchId)
  await expect(k).toHaveText('k(')
  await tap(k)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

test('Shift locked', async ({ page }) => {
  await init(page)

  const k = page.getByText('k(')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(shift)
  await expect(k).toHaveText('K(')

  await tap(k)
  await tap(k)
  await expect(k).toHaveText('K(')

  await tap(shift)
  await expect(k).toHaveText('k(')

  await tap(k)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

for (const releaseShiftFirst of [false, true]) {
  test(`Caps Lock survives typing while the second Shift is held (Shift released first: ${releaseShiftFirst})`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const shift = page.locator('.fcitx-keyboard-shift')
    const k = page.getByText('k(')
    await tap(shift)
    await page.clock.runFor(50)
    const heldShift = await touchDown(shift)
    await tap(k)
    await tap(k)
    const heldK = await touchDown(k)
    if (releaseShiftFirst) {
      await touchUp(shift, heldShift)
      await touchUp(k, heldK)
    }
    else {
      await touchUp(k, heldK)
      await touchUp(shift, heldShift)
    }

    await expect(k).toHaveText('K(')
    await tap(k)
    await tap(k)
    await expect(k).toHaveText('K(')
    await tap(shift)
    await expect(k).toHaveText('k(')
    await tap(k)
    expect(await getSentEvents(page)).toEqual([
      ...Array.from({ length: 5 }, () => ({
        type: 'KEY_DOWN',
        data: { key: 'K', code: 'KeyK' },
      })),
      {
        type: 'KEY_DOWN',
        data: { key: 'k', code: 'KeyK' },
      },
    ])
  })
}

for (const taps of [3, 4, 5, 6]) {
  test(`${taps} rapid Shift taps consume consecutive double-tap pairs`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const shift = page.locator('.fcitx-keyboard-shift')
    const k = page.getByText('k(')
    for (let i = 0; i < taps; ++i) {
      await tap(shift)
      await page.clock.runFor(50)
    }
    const locked = taps % 2 === 0
    await expect(k).toHaveText(locked ? 'K(' : 'k(')
    await tap(k)
    await tap(k)
    expect(await getSentEvents(page)).toEqual(Array.from({ length: 2 }, () => ({
      type: 'KEY_DOWN',
      data: {
        key: locked ? 'K' : 'k',
        code: 'KeyK',
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
    const k = page.getByText('k(')
    await tap(shift)
    await page.clock.runFor(interval)
    await tap(shift)
    const locked = interval < 300
    await expect(k).toHaveText(locked ? 'K(' : 'k(')
    await tap(k)
    await tap(k)
    expect(await getSentEvents(page)).toEqual(Array.from({ length: 2 }, () => ({
      type: 'KEY_DOWN',
      data: {
        key: locked ? 'K' : 'k',
        code: 'KeyK',
      },
    })))
  })
}

for (const firstShiftHeld of [false, true]) {
  for (const releaseKFirst of [false, true]) {
    test(`Held K interrupts Shift pairing (first Shift held: ${firstShiftHeld}, K released first: ${releaseKFirst})`, async ({ page }) => {
      await init(page)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const shift = page.locator('.fcitx-keyboard-shift')
      const k = page.getByText('k(')
      const firstShift = await touchDown(shift)
      if (!firstShiftHeld) {
        await touchUp(shift, firstShift)
      }
      await page.clock.runFor(50)
      const heldK = await touchDown(k)
      if (firstShiftHeld) {
        await touchUp(shift, firstShift)
      }
      await page.clock.runFor(50)
      const secondShift = await touchDown(shift)
      if (releaseKFirst) {
        await touchUp(k, heldK)
        await touchUp(shift, secondShift)
      }
      else {
        await touchUp(shift, secondShift)
        await touchUp(k, heldK)
      }

      await expect(k).toHaveText('K(')
      await tap(k)
      await expect(k).toHaveText('k(')
      await tap(k)
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: 'K', code: 'KeyK' },
        },
        {
          type: 'KEY_DOWN',
          data: { key: 'K', code: 'KeyK' },
        },
        {
          type: 'KEY_DOWN',
          data: { key: 'k', code: 'KeyK' },
        },
      ])
    })
  }
}

test('Shift interrupted', async ({ page }) => {
  await init(page)

  const k = page.getByText('k(')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await tap(k)
  await tap(shift)

  await expect(k).toHaveText('K(')
  await tap(k)
  await expect(k).toHaveText('k(')
  await tap(k)
  const sentEvents = await getSentEvents(page)
  expect(sentEvents).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

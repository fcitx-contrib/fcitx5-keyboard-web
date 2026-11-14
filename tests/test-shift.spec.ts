import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent, tap, touchDown, touchMove, touchUp, touchUpTogether } from './util'

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

for (const locked of [false, true]) {
  for (const shiftFirst of [false, true]) {
    test(`Shift and K ending together commit uppercase (locked: ${locked}, Shift first: ${shiftFirst})`, async ({ page }) => {
      await init(page)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const shift = page.locator('.fcitx-keyboard-shift')
      const k = page.getByText('k(')
      if (locked) {
        await tap(shift)
        await page.clock.runFor(50)
      }
      const heldShift = await touchDown(shift)
      const heldK = await touchDown(k)
      await touchUpTogether(shift, shiftFirst
        ? [heldShift, heldK]
        : [heldK, heldShift])
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: 'K', code: 'KeyK' },
        },
      ])
      expect(await page.evaluate(() => window.touches)).toEqual([])
      await expect(k).toHaveText(locked ? 'K(' : 'k(')
      await tap(k)
      await tap(k)
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: 'K', code: 'KeyK' },
        },
        ...Array.from({ length: 2 }, () => ({
          type: 'KEY_DOWN',
          data: {
            key: locked ? 'K' : 'k',
            code: 'KeyK',
          },
        })),
      ])
    })
  }
}

for (const locked of [false, true]) {
  for (const gesture of ['swipe', 'menu', 'cancel'] as const) {
    for (const typeBeforeRelease of [false, true]) {
      test(`Held Shift survives K ${gesture} (locked: ${locked}, type before release: ${typeBeforeRelease})`, async ({ page }) => {
        await init(page)
        await page.clock.install({ time: 0 })
        await page.clock.pauseAt(1000)
        const shift = page.locator('.fcitx-keyboard-shift')
        const k = page.getByText('k(')
        if (locked) {
          await tap(shift)
          await page.clock.runFor(50)
        }
        const heldShift = await touchDown(shift)
        const heldK = await touchDown(k)
        if (gesture === 'menu') {
          await page.clock.runFor(300)
          await expect(page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')).toHaveText('(')
        }
        else {
          await touchMove(k, heldK, 0, gesture === 'swipe'
            ? -31
            : 31)
        }
        await touchUp(k, heldK)
        await expect(k).toHaveText('K(')
        if (typeBeforeRelease) {
          await tap(k)
          await expect(k).toHaveText('K(')
        }
        await touchUp(shift, heldShift)
        await expect(k).toHaveText(locked ? 'K(' : 'k(')
        await tap(k)
        await tap(k)
        expect(await getSentEvents(page)).toEqual([
          ...(gesture === 'cancel'
            ? []
            : [
                {
                  type: 'KEY_DOWN',
                  data: { key: '(', code: '' },
                },
              ]),
          ...(typeBeforeRelease
            ? [
                {
                  type: 'KEY_DOWN',
                  data: { key: 'K', code: 'KeyK' },
                },
              ]
            : []),
          ...Array.from({ length: 2 }, () => ({
            type: 'KEY_DOWN',
            data: {
              key: locked ? 'K' : 'k',
              code: 'KeyK',
            },
          })),
        ])
      })
    }
  }
}

for (const key of ['space', 'digit'] as const) {
  test(`Held Shift survives numpad ${key} during an input-type change`, async ({ page }) => {
    await init(page)
    const shift = page.locator('.fcitx-keyboard-shift')
    const k = page.getByText('k(')
    const heldShift = await touchDown(shift)
    await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'number' })
    const numpad = page.locator('.fcitx-keyboard-numpad')
    await tap(key === 'space'
      ? numpad.locator('.fcitx-keyboard-numpad-space')
      : numpad.getByText('1', { exact: true }))
    await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'text' })
    await expect(k).toHaveText('K(')
    await tap(k)
    await touchUp(shift, heldShift)
    await expect(k).toHaveText('k(')
    await tap(k)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'COMMIT',
        data: key === 'space'
          ? ' '
          : '1',
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

for (const key of ['space', 'backspace'] as const) {
  test(`Held Shift with ${key} alone does not count as a letter press`, async ({ page }) => {
    await init(page)
    const shift = page.locator('.fcitx-keyboard-shift')
    const k = page.getByText('k(')
    const heldShift = await touchDown(shift)
    await tap(page.locator(`.fcitx-keyboard .fcitx-keyboard-${key}`))
    await touchUp(shift, heldShift)
    await expect(k).toHaveText('K(')
    await tap(k)
    await expect(k).toHaveText('k(')
    await tap(k)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: key === 'space'
          ? { key: ' ', code: 'Space' }
          : { key: '', code: 'Backspace' },
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

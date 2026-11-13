import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { getSentEvents, init, longPress, tap, touchDown, touchMove, touchUp } from './util'

async function initMenu(page: Page, label: string) {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  return {
    key: page.getByText(label),
    highlighted: page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover'),
  }
}

async function holdMenu(key: Locator) {
  const touchId = await touchDown(key)
  await key.page().clock.runFor(300)
  return touchId
}

test('Long press', async ({ page }) => {
  await init(page)

  const l = page.getByText('l)')
  await longPress(l, async () => {
    return expect(page.locator('.fcitx-keyboard-popover-background path')).toHaveCount(1)
  })
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: ')', code: '' },
    },
  ])
})

test('Slide right', async ({ page }) => {
  await init(page)

  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  const period = page.getByText('.\\')
  await longPress(period, async (touchId) => {
    await expect(highlightedPopover).toHaveText('\\')
    await touchMove(period, touchId, 30, 0)
    return expect(highlightedPopover).toHaveText('>')
  })
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '>', code: '' },
    },
  ])
})

test('Slide left after shift', async ({ page }) => {
  await init(page)

  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  const l = page.getByText('l)')
  await longPress(l, async (touchId) => {
    await expect(highlightedPopover).toHaveText(')')
    await touchMove(l, touchId, -90, 0)
    return expect(highlightedPopover).toHaveText('l')
  })
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'l', code: 'KeyL' },
    },
  ])
})

for (const width of [360, 640]) {
  for (const direction of [-1, 1]) {
    test(`Menu selection uses exactly 30 pixels in direction ${direction} at viewport ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 })
      const { key, highlighted } = await initMenu(page, 'h/')
      const touchId = await holdMenu(key)
      await expect(highlighted).toHaveText('/')

      await touchMove(key, touchId, direction * 29, 0)
      await expect(highlighted).toHaveText('/')
      await touchMove(key, touchId, direction, 0)
      await expect(highlighted).toHaveText(direction > 0
        ? 'H'
        : '|')
      await touchUp(key, touchId)
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: direction > 0
            ? { key: 'H', code: 'KeyH' }
            : { key: '|', code: '' },
        },
      ])
    })
  }
}

test('Menu selection preserves remainder when reversing before the next step', async ({ page }) => {
  // A 30px-wide source key isolates reversal semantics from key-width stepping.
  await page.setViewportSize({ width: 300, height: 720 })
  const { key, highlighted } = await initMenu(page, 's*')
  const touchId = await holdMenu(key)
  await touchMove(key, touchId, 45, 0)
  await expect(highlighted).toHaveText('S')
  await touchMove(key, touchId, -20, 0) // Total +25, consumed anchor still +30.
  await expect(highlighted).toHaveText('S')
  await touchMove(key, touchId, -10, 0) // Total +15 is not a full reverse step.
  await expect(highlighted).toHaveText('S')
  await touchMove(key, touchId, -15, 0) // Total 0 is exactly one reverse step.
  await expect(highlighted).toHaveText('*')
  await touchUp(key, touchId)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '*', code: '' },
    },
  ])
})

test('Menu selection is equivalent for coarse and fine reversal samples', async ({ page }) => {
  const { key, highlighted } = await initMenu(page, 'h/')
  for (const positions of [
    [45, -15],
    [15, 30, 45, 35, 25, 15, 0, -15],
  ]) {
    const touchId = await holdMenu(key)
    let lastX = 0
    for (const x of positions) {
      await touchMove(key, touchId, x - lastX, 0)
      lastX = x
    }
    await expect(highlighted).toHaveText('/')
    await touchUp(key, touchId)
  }
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '/', code: 'Slash' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: '/', code: 'Slash' },
    },
  ])
})

for (const direction of [-1, 1]) {
  test(`Menu selection consumes clamped edge movement in direction ${direction}`, async ({ page }) => {
    const { key, highlighted } = await initMenu(page, 'h/')
    const touchId = await holdMenu(key)
    await touchMove(key, touchId, direction * 90, 0)
    await expect(highlighted).toHaveText(direction > 0
      ? 'H'
      : '%')
    await touchMove(key, touchId, -direction * 15, 0)
    await expect(highlighted).toHaveText(direction > 0
      ? 'H'
      : '%')
    await touchMove(key, touchId, -direction * 15, 0)
    await expect(highlighted).toHaveText(direction > 0
      ? '/'
      : '|')
    await touchUp(key, touchId)
  })
}

test('Reset layer', async ({ page }) => {
  await init(page)

  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  const g = page.getByText('g^')
  await expect(g).toHaveText('G^')
  await longPress(g)
  await expect(g).toHaveText('g^')
})

test('Interrupted', async ({ page }) => {
  await init(page)

  const f = page.getByText('f-')
  const m = page.getByText('m"')
  await longPress(f, async () => {
    await tap(m)
    return expect(page.locator('.fcitx-keyboard-popover-container')).not.toBeVisible()
  })
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'm', code: 'KeyM' },
    },
  ])
})

test('Unicode', async ({ page }) => {
  await init(page)

  const comma = page.locator('.fcitx-keyboard').getByText(',', { exact: true })
  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  await longPress(comma, async (touchId) => {
    await touchMove(comma, touchId, -30, 0)
    return expect(highlightedPopover.locator('svg')).toHaveCount(1)
  })
  expect(await getSentEvents(page)).toEqual([
    { type: 'UNICODE' },
  ])
})

test('Quick phrase', async ({ page }) => {
  await init(page)

  const comma = page.locator('.fcitx-keyboard').getByText(',', { exact: true })
  const highlightedPopover = page.locator('.fcitx-keyboard-highlighted .fcitx-keyboard-popover')
  await longPress(comma, async (touchId) => {
    await touchMove(comma, touchId, 30, 0)
    return expect(highlightedPopover.locator('svg')).toHaveCount(1)
  })
  expect(await getSentEvents(page)).toEqual([
    { type: 'QUICKPHRASE' },
  ])
})

import type { Locator } from '@playwright/test'
import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getKey, getKeyBackground, getSentEvents, GRAY, init, sendSystemEvent, tap, touchDown, touchMove, touchUp, WHITE } from './util'

async function getFontSize(locator: Locator) {
  const fontSize = await locator.evaluate(element => window.getComputedStyle(element).getPropertyValue('font-size'))
  return Number(fontSize.match(/^(\S+)px$/)![1])
}

test('Space', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'pinyin',
      inputMethods: [
        { name: 'keyboard-us', displayName: 'English' },
        { name: 'pinyin', displayName: '拼音' },
      ],
    },
  })
  await expect(space).toHaveText('拼音')

  await tap(space)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: {
        key: ' ',
        code: 'Space',
      },
    },
  ])
})

test('Adjust font size', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  const longLabel = 'Long Long Long Long Long'
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'long',
      inputMethods: [
        { name: 'long', displayName: longLabel },
      ],
    },
  })
  await expect(space).toHaveText(longLabel)
  const fontSize = await getFontSize(space)
  expect(fontSize).toBeLessThan(12)

  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(space, 'Label preserved on layer change').toHaveText(longLabel)
  expect(await getFontSize(space), 'Font size preserved on layer change').toEqual(fontSize)
})

for (const [dx, dy] of [
  [0, -30],
  [29, -30],
  [-29, 30],
]) {
  test(`Drift (${dx}, ${dy}) still commits a space`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const space = page.locator('.fcitx-keyboard-space')
    const touchId = await touchDown(space)
    await touchMove(space, touchId, dx, dy)
    expect(await getSentEvents(page)).toEqual([])
    await touchUp(space, touchId)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: { key: ' ', code: 'Space' },
      },
    ])
  })
}

for (const direction of [-1, 1]) {
  test(`Horizontal activation in direction ${direction} consumes the first 30 pixels`, async ({ page }) => {
    await init(page)
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const space = page.locator('.fcitx-keyboard-space')
    const activationTouch = await touchDown(space)
    await touchMove(space, activationTouch, direction * 30, 0)
    await touchUp(space, activationTouch)
    expect(await getSentEvents(page), 'Exactly 30 activates without emitting a space or arrow').toEqual([])

    const touchId = await touchDown(space)
    await touchMove(space, touchId, direction * 29, 0)
    await touchMove(space, touchId, direction, 0)
    await page.clock.runFor(1000)
    await touchMove(space, touchId, direction * 14, 0)
    expect(await getSentEvents(page), 'No action before 45, even after the long-press delay').toEqual([])
    await touchMove(space, touchId, direction, 0)
    await touchUp(space, touchId)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: {
          key: '',
          code: direction < 0
            ? 'ArrowLeft'
            : 'ArrowRight',
        },
      },
    ])
  })
}

test('Vertical movement over 30 cancels the space without moving the cursor', async ({ page }) => {
  await init(page)
  const space = page.locator('.fcitx-keyboard-space')
  const touchId = await touchDown(space)
  await touchMove(space, touchId, 0, 31)
  await touchUp(space, touchId)
  expect(await getSentEvents(page)).toEqual([])
})

test('Holding space suppresses the tap but still allows a later horizontal slide', async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  const space = page.locator('.fcitx-keyboard-space')
  const heldTouch = await touchDown(space)
  await page.clock.runFor(300)
  await touchUp(space, heldTouch)
  expect(await getSentEvents(page)).toEqual([])

  const slideTouch = await touchDown(space)
  await page.clock.runFor(300)
  await touchMove(space, slideTouch, -30, 0)
  expect(await getSentEvents(page)).toEqual([])
  await touchMove(space, slideTouch, -15, 0)
  await touchUp(space, slideTouch)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowLeft' },
    },
  ])
})

test('Continuous slide uses the original signed grid on reversal', async ({ page }) => {
  await init(page)
  const space = page.locator('.fcitx-keyboard-space')
  const touchId = await touchDown(space)
  await touchMove(space, touchId, -30, 0)
  expect(await getSentEvents(page)).toEqual([])
  await touchMove(space, touchId, -30, 0)
  const leftEvent: VirtualKeyboardEvent = {
    type: 'KEY_DOWN',
    data: { key: '', code: 'ArrowLeft' },
  }
  const rightEvent: VirtualKeyboardEvent = {
    type: 'KEY_DOWN',
    data: { key: '', code: 'ArrowRight' },
  }
  const sentEvents: VirtualKeyboardEvent[] = [leftEvent, leftEvent]
  expect(await getSentEvents(page)).toEqual(sentEvents)

  await touchMove(space, touchId, 1, 0)
  sentEvents.push(rightEvent)
  expect(await getSentEvents(page), 'Returning from -60 to -59 immediately crosses the fixed grid boundary').toEqual(sentEvents)
  await touchMove(space, touchId, 29, 0)
  sentEvents.push(rightEvent)
  expect(await getSentEvents(page)).toEqual(sentEvents)
  await touchMove(space, touchId, 45, 0)
  sentEvents.push(rightEvent, rightEvent, rightEvent)
  expect(await getSentEvents(page), 'Crossing the original touchdown emits all signed steps').toEqual(sentEvents)
  await touchUp(space, touchId)
  expect(await getSentEvents(page), 'No space key event on slide release').toEqual(sentEvents)
})

test('Coarse and fine reversal samples crossing the anchor emit the same cursor actions', async ({ page }) => {
  const rightEvent = {
    type: 'KEY_DOWN',
    data: { key: '', code: 'ArrowRight' },
  }
  const leftEvent = {
    type: 'KEY_DOWN',
    data: { key: '', code: 'ArrowLeft' },
  }
  for (const positions of [
    [60, -15],
    [60, 59, 45, 44, 30, 15, 0, -15],
  ]) {
    await init(page)
    const space = page.locator('.fcitx-keyboard-space')
    const touchId = await touchDown(space)
    let lastX = 0
    for (const x of positions) {
      await touchMove(space, touchId, x - lastX, 0)
      lastX = x
    }
    await touchUp(space, touchId)
    expect(await getSentEvents(page)).toEqual([
      rightEvent,
      rightEvent,
      ...Array.from({ length: 5 }).fill(leftEvent),
    ])
  }
})

test('Another finger does not send a pending space early', async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  const space = page.locator('.fcitx-keyboard-space')
  const q = getKey(page, 'q')
  const spaceTouch = await touchDown(space)
  const qTouch = await touchDown(q)
  expect(await getSentEvents(page)).toEqual([])
  await touchUp(space, spaceTouch)
  expect(await getSentEvents(page), 'Releasing space must not flush the still-held letter').toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: ' ', code: 'Space' },
    },
  ])
  await touchUp(q, qTouch)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: ' ', code: 'Space' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: 'q', code: 'KeyQ' },
    },
  ])
})

test('Space sliding continues through another finger pressing and releasing a key', async ({ page }) => {
  await init(page)
  const space = page.locator('.fcitx-keyboard-space')
  const q = getKey(page, 'q')
  const spaceTouch = await touchDown(space)
  await touchMove(space, spaceTouch, -45, 0)
  const qTouch = await touchDown(q)
  await touchMove(space, spaceTouch, 1, 0)
  await touchUp(q, qTouch)
  await touchMove(space, spaceTouch, -1, 0)
  await touchUp(space, spaceTouch)
  const events = await getSentEvents(page)
  expect(events.filter(event => event.type === 'KEY_DOWN' && event.data.code !== 'KeyQ')).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowLeft' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowRight' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowLeft' },
    },
  ])
})

test('Continuous slide shouldn\'t be interrupted by setCandidates', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  const touchId = await touchDown(space)
  await expect(getKeyBackground(space)).toHaveCSS('fill', GRAY)

  await touchMove(space, touchId, -45, 0)
  await expect(getKeyBackground(space)).toHaveCSS('fill', GRAY)

  // When preedit exists, sliding space may move cursor thus change candidates.
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      highlighted: 0,
      candidates: [
        {
          text: '一',
          label: '1',
          comment: '',
        },
      ],
      scrollState: SCROLL_NONE,
      scrollStart: false,
      scrollEnd: false,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
  await expect(getKeyBackground(space)).toHaveCSS('fill', GRAY)

  await touchUp(space, touchId)
  await expect(getKeyBackground(space)).toHaveCSS('fill', WHITE)
})

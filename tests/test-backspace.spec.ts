import type { Page } from '@playwright/test'
import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { SCROLLING } from '../src/api.d'
import { getKey, getSentEvents, getToolbarButton, GRAY, init, sendSystemEvent, tap, touchDown, touchMove, touchUp, touchUpTogether, WHITE } from './util'

type Surface = 'keyboard' | 'candidates' | 'editor' | 'symbol'

async function initSurface(page: Page, surface: Surface) {
  await init(page)
  if (surface === 'editor') {
    await getToolbarButton(page, 4).tap()
    return page.locator('.fcitx-keyboard-editor-button-container').nth(8)
  }
  if (surface === 'symbol') {
    await tap(getKey(page, '#+='))
    return page.locator('.fcitx-keyboard-return-backspace')
  }
  if (surface === 'candidates') {
    await sendSystemEvent(page, {
      type: 'CANDIDATES',
      data: {
        inputContext: 'context',
        generation: 1,
        candidates: [
          { text: '词', label: '', comment: '' },
        ],
        highlighted: 0,
        scrollState: SCROLLING,
        scrollStart: true,
        scrollEnd: true,
        hasClientPreedit: true,
        tabActions: [],
      },
    })
    await page.locator('.fcitx-keyboard-candidate-bar .fcitx-keyboard-toolbar-button').tap()
    return page.locator('.fcitx-keyboard-side-button-container').nth(2)
  }
  return page.locator('.fcitx-keyboard > .fcitx-keyboard-row > .fcitx-keyboard-key-container').filter({
    has: page.locator('.fcitx-keyboard-backspace'),
  })
}

async function getBackspaceEvents(page: Page) {
  return (await getSentEvents(page)).filter(event => event.type === 'BACKSPACE_SLIDE'
    || (event.type === 'KEY_DOWN' && event.data.code === 'Backspace'))
}

function getOtherKey(page: Page, surface: Surface) {
  switch (surface) {
    case 'keyboard':
      return getKey(page, 'q')
    case 'candidates':
      return page.locator('.fcitx-keyboard-side-button-container').nth(3)
    case 'editor':
      return page.locator('.fcitx-keyboard-editor-button-container').nth(0)
    case 'symbol':
      // Symbol selection can pop this display; the lock key keeps the surface alive.
      return page.locator('.fcitx-keyboard-symbol-lock')
  }
}

for (const surface of [
  'keyboard',
  'candidates',
  'editor',
  'symbol',
] as const) {
  test.describe(surface, () => {
    const colorProperty = surface === 'keyboard'
      ? 'fill'
      : 'background-color'
    const visualSelector = surface === 'keyboard'
      ? ':scope > .fcitx-keyboard-key-background'
      : ':scope > div'

    test('Backspace', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      const visual = backspace.locator(visualSelector)
      await expect(visual).toHaveCSS(colorProperty, GRAY)

      const touchId = await touchDown(backspace)
      await expect(visual).toHaveCSS(colorProperty, WHITE)

      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: '', code: 'Backspace' },
        },
      ])
      await expect(visual).toHaveCSS(colorProperty, GRAY)
    })

    test('Slide', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      const visual = backspace.locator(visualSelector)
      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, -60, 0)
      await expect(visual).toHaveCSS(colorProperty, WHITE)
      // A one-pixel reversal crosses a fixed grid boundary without reanchoring.
      await touchMove(backspace, touchId, 1, 0)
      await touchUp(backspace, touchId)
      await expect(visual).toHaveCSS(colorProperty, GRAY)

      const leftEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'LEFT' }
      const rightEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'RIGHT' }
      const releaseEvent: VirtualKeyboardEvent = { type: 'BACKSPACE_SLIDE', data: 'RELEASE' }
      expect(await getSentEvents(page)).toEqual([
        leftEvent,
        leftEvent,
        rightEvent,
        releaseEvent,
      ])
    })

    for (const cancel of [false, true]) {
      test(`Long press stops on touch${cancel ? 'cancel' : 'end'}`, async ({ page }) => {
        const backspace = await initSurface(page, surface)
        const visual = backspace.locator(visualSelector)
        await page.clock.install({ time: 0 })
        await page.clock.pauseAt(1000)

        const touchId = await touchDown(backspace)
        await page.clock.runFor(300)
        expect(await getSentEvents(page)).toEqual([])

        await page.clock.runFor(80 * 3)
        expect(await getSentEvents(page)).toEqual(Array.from({ length: 3 }, () => ({
          type: 'KEY_DOWN',
          data: { key: '', code: 'Backspace' },
        })))
        await expect(visual).toHaveCSS(colorProperty, WHITE)
        await expect(page.locator('.fcitx-keyboard-popover')).toBeHidden()

        await touchMove(backspace, touchId, -25, 0)
        await page.clock.runFor(80)
        expect(await getSentEvents(page)).toHaveLength(4)

        await touchUp(backspace, touchId, cancel)
        await page.clock.runFor(500)
        expect(await getSentEvents(page)).toHaveLength(4)
        await expect(visual).toHaveCSS(colorProperty, GRAY)
      })
    }

    test('Exactly 30 activates sliding and prevents long press before the first step', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)

      const activationTouch = await touchDown(backspace)
      await touchMove(backspace, activationTouch, -30, 0)
      await touchUp(backspace, activationTouch)
      expect(await getSentEvents(page), 'Activation without a step suppresses a normal Backspace').toEqual([
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
      ])

      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, -30, 0)
      await page.clock.runFor(1000)
      await touchMove(backspace, touchId, -14, 0)
      expect(await getSentEvents(page), 'No long-press repeat or slide action at 44 pixels').toHaveLength(1)
      await touchMove(backspace, touchId, -1, 0)
      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
      ])
    })

    test('Small diagonal drift still commits a Backspace', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, 29, -30)
      expect(await getSentEvents(page)).toEqual([])
      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: '', code: 'Backspace' },
        },
      ])
    })

    test('Vertical movement over 30 cancels click and long press without sliding', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, 0, -31)
      await page.clock.runFor(1000)
      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([])
    })

    test('Repeating Backspace switches to sliding at 30 and stops before its first step', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const touchId = await touchDown(backspace)
      await page.clock.runFor(380)
      const repeatEvent: VirtualKeyboardEvent = {
        type: 'KEY_DOWN',
        data: { key: '', code: 'Backspace' },
      }
      expect(await getSentEvents(page)).toEqual([repeatEvent])
      await touchMove(backspace, touchId, -29, 0)
      await page.clock.runFor(80)
      expect(await getSentEvents(page)).toEqual([repeatEvent, repeatEvent])
      await touchMove(backspace, touchId, -1, 0)
      await page.clock.runFor(500)
      expect(await getSentEvents(page), 'Repeating stops at activation, not at the first 45-pixel step').toEqual([repeatEvent, repeatEvent])
      await touchMove(backspace, touchId, -15, 0)
      await touchUp(backspace, touchId)
      await page.clock.runFor(500)
      expect(await getSentEvents(page)).toEqual([
        repeatEvent,
        repeatEvent,
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
      ])
    })

    test('Another key does not send a pending Backspace early', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const touchId = await touchDown(backspace)
      const otherKey = getOtherKey(page, surface)
      const otherTouch = await touchDown(otherKey)
      expect(await getBackspaceEvents(page)).toEqual([])
      await touchUp(otherKey, otherTouch)
      expect(await getBackspaceEvents(page)).toEqual([])
      await touchUp(backspace, touchId)
      expect(await getBackspaceEvents(page)).toEqual([
        {
          type: 'KEY_DOWN',
          data: { key: '', code: 'Backspace' },
        },
      ])
    })

    test('Another key does not stop repeated Backspace', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      const touchId = await touchDown(backspace)
      await page.clock.runFor(380)
      const otherKey = getOtherKey(page, surface)
      const otherTouch = await touchDown(otherKey)
      await touchUp(otherKey, otherTouch)
      await page.clock.runFor(80)
      await touchUp(backspace, touchId)
      await page.clock.runFor(500)
      expect(await getBackspaceEvents(page)).toEqual(Array.from({ length: 2 }, () => ({
        type: 'KEY_DOWN',
        data: { key: '', code: 'Backspace' },
      })))
    })

    test('Another key does not end a slide or send its release', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, -45, 0)
      const otherKey = getOtherKey(page, surface)
      const otherTouch = await touchDown(otherKey)
      await touchMove(backspace, touchId, 1, 0)
      await touchUp(otherKey, otherTouch)
      expect(await getBackspaceEvents(page)).toEqual([
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RIGHT' },
      ])
      await touchMove(backspace, touchId, -1, 0)
      await touchUp(backspace, touchId)
      expect(await getBackspaceEvents(page)).toEqual([
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RIGHT' },
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
      ])
    })

    if (surface !== 'keyboard') {
      test('Native touch tap deletes once', async ({ page }) => {
        const backspace = await initSurface(page, surface)
        await backspace.tap()
        expect(await getSentEvents(page)).toEqual([
          {
            type: 'KEY_DOWN',
            data: { key: '', code: 'Backspace' },
          },
        ])
      })
    }
  })
}

for (const cancel of [false, true]) {
  test(`Batched touch${cancel ? 'cancel' : 'end'} stops repeating Backspace in the second changed touch`, async ({ page }) => {
    const backspace = await initSurface(page, 'keyboard')
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const letterTouch = await touchDown(getKey(page, 'q'))
    const backspaceTouch = await touchDown(backspace)
    await page.clock.runFor(380)
    const repeatEvent: VirtualKeyboardEvent = {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    }
    expect(await getBackspaceEvents(page)).toEqual([repeatEvent])

    await touchUpTogether(backspace, [letterTouch, backspaceTouch], cancel)
    expect(await page.evaluate(() => window.touches)).toEqual([])
    await page.clock.runFor(500)
    expect(await getBackspaceEvents(page), 'No repeat after either touch has ended').toEqual([repeatEvent])
  })

  test(`Batched touch${cancel ? 'cancel' : 'end'} releases a sliding Backspace in the second changed touch once`, async ({ page }) => {
    const backspace = await initSurface(page, 'keyboard')
    await page.clock.install({ time: 0 })
    await page.clock.pauseAt(1000)
    const letterTouch = await touchDown(getKey(page, 'q'))
    const backspaceTouch = await touchDown(backspace)
    await touchMove(backspace, backspaceTouch, -45, 0)
    expect(await getBackspaceEvents(page)).toEqual([
      { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    ])

    await touchUpTogether(backspace, [letterTouch, backspaceTouch], cancel)
    await page.clock.runFor(500)
    expect(await getBackspaceEvents(page)).toEqual([
      { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
      { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
    ])
  })
}

test('Coarse and fine reversal samples crossing the anchor emit the same backspace actions', async ({ page }) => {
  for (const positions of [
    [-60, 15],
    [-60, -59, -45, -44, -30, -15, 0, 15],
  ]) {
    const backspace = await initSurface(page, 'keyboard')
    const touchId = await touchDown(backspace)
    let lastX = 0
    for (const x of positions) {
      await touchMove(backspace, touchId, x - lastX, 0)
      lastX = x
    }
    await touchUp(backspace, touchId)
    expect(await getSentEvents(page)).toEqual([
      { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
      { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
      ...Array.from({ length: 5 }, () => ({ type: 'BACKSPACE_SLIDE', data: 'RIGHT' })),
      { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
    ])
  }
})

test('Returning from a surface explicitly cancels repeated Backspace', async ({ page }) => {
  const backspace = await initSurface(page, 'symbol')
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  const touchId = await touchDown(backspace)
  await page.clock.runFor(380)
  const returnButton = page.locator('.fcitx-keyboard-return-button:visible')
  const returnTouch = await touchDown(returnButton)
  await touchUp(returnButton, returnTouch)
  await page.clock.runFor(500)
  await touchUp(backspace, touchId)
  await page.clock.runFor(500)
  expect(await getBackspaceEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    },
  ])
})

test('Synchronous surface cancellation aborts the remaining steps of a large slide', async ({ page }) => {
  const backspace = await initSurface(page, 'editor')
  const returnButton = await page.locator('.fcitx-keyboard-return-button:visible').elementHandle()
  await page.evaluate((button) => {
    const push = window.sentEvents.push.bind(window.sentEvents)
    let canceled = false
    window.sentEvents.push = (...events) => {
      const length = push(...events)
      if (!canceled && events.some(event => event.type === 'BACKSPACE_SLIDE' && event.data === 'LEFT')) {
        canceled = true
        const box = button!.getBoundingClientRect()
        const touch = new Touch({
          identifier: 1000000,
          target: button!,
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
        })
        button!.dispatchEvent(new TouchEvent('touchstart', {
          touches: [...window.touches, touch],
          changedTouches: [touch],
          bubbles: true,
        }))
      }
      return length
    }
  }, returnButton)
  const touchId = await touchDown(backspace)
  await touchMove(backspace, touchId, -105, 0)
  await touchUp(backspace, touchId)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
  ])
})

test('Queued repeat callbacks cannot act after sliding or during a replacement touch', async ({ page }) => {
  const backspace = await initSurface(page, 'keyboard')
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  // Preserve callbacks to simulate a timer task queued just before cancellation.
  const pending = await page.evaluateHandle(() => {
    const callbacks: (() => void)[] = []
    const setInterval = window.setInterval
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (typeof handler === 'function') {
        callbacks.push(() => handler(...args))
      }
      return setInterval(handler, timeout, ...args)
    }) as typeof window.setInterval
    return callbacks
  })
  const slideTouch = await touchDown(backspace)
  await page.clock.runFor(300)
  expect(await pending.evaluate(callbacks => callbacks.length)).toBe(1)
  await touchMove(backspace, slideTouch, -30, 0)
  await pending.evaluate(callbacks => callbacks[0]())
  expect(await getSentEvents(page)).toEqual([])
  await touchUp(backspace, slideTouch)

  const repeatTouch = await touchDown(backspace)
  await page.clock.runFor(300)
  expect(await pending.evaluate(callbacks => callbacks.length)).toBe(2)
  await pending.evaluate(callbacks => callbacks[0]())
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
  ])
  await pending.evaluate(callbacks => callbacks[1]())
  await touchUp(backspace, repeatTouch)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    },
  ])
  await pending.evaluate(callbacks => callbacks[1]())
  expect(await getSentEvents(page)).toHaveLength(2)
  await pending.dispose()
})

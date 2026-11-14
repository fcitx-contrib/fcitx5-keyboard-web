import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getSentEvents, getToolbarButton, init, sendSystemEvent, tap, touchDown, touchMove, touchUp } from './util'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

test('Session ABORT discards a pending letter and accepts a fresh press', async ({ page }) => {
  const k = page.getByText('k(')
  const id = await touchDown(k)
  await sendSystemEvent(page, { type: 'ABORT' })
  await touchUp(k, id)
  expect(await getSentEvents(page)).toEqual([])
  await tap(k)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

test('Session ABORT stops main Backspace repeat without a final deletion', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)
  await sendSystemEvent(page, { type: 'ABORT' })
  await page.clock.runFor(160)
  await touchUp(backspace, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'Backspace' },
    },
  ])
  await tap(backspace)
  expect(await getSentEvents(page)).toHaveLength(2)
})

test('Session ABORT clears held Shift and its pending double-tap pair', async ({ page }) => {
  const shift = page.locator('.fcitx-keyboard-shift')
  const k = page.getByText('k(')
  const id = await touchDown(shift)
  await sendSystemEvent(page, { type: 'ABORT' })
  await expect(k).toHaveText('k(')
  await touchUp(shift, id)
  await tap(shift)
  await tap(k)
  await tap(k)
  expect(await getSentEvents(page)).toEqual([
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

test('Session ABORT never completes an activated Backspace slide', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await touchMove(backspace, id, -60, 0)
  await sendSystemEvent(page, { type: 'ABORT' })
  await touchUp(backspace, id)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
  ])
})

test('Session ABORT clears a pending candidate long press', async ({ page }) => {
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      candidates: [
        { text: '候选', label: '', comment: '' },
      ],
      highlighted: -1,
      scrollState: SCROLL_NONE,
      scrollStart: false,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
  const candidate = page.locator('.fcitx-keyboard-candidate')
  const id = await touchDown(candidate)
  await page.clock.runFor(299)
  await sendSystemEvent(page, { type: 'ABORT' })
  await page.clock.runFor(100)
  await touchUp(candidate, id)
  await expect(candidate).not.toContainClass('fcitx-keyboard-pressed')
  expect(await getSentEvents(page)).toEqual([])
})

test('Session ABORT rejects a queued editor repeat and allows a fresh press', async ({ page }) => {
  await getToolbarButton(page, 4).tap()
  const queued = await page.evaluateHandle(() => {
    const callbacks: (() => void)[] = []
    const original = window.setInterval.bind(window)
    Object.defineProperty(window, 'setInterval', {
      configurable: true,
      value(handler: TimerHandler, timeout?: number, ...args: unknown[]) {
        if (typeof handler === 'function') {
          callbacks.push(() => handler(...args))
        }
        return original(handler, timeout, ...args)
      },
    })
    return callbacks
  })
  const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
  const id = await touchDown(left)
  await page.clock.runFor(300)
  expect(await queued.evaluate(callbacks => callbacks.length)).toBe(1)
  await sendSystemEvent(page, { type: 'ABORT' })
  await queued.evaluate(callbacks => callbacks.forEach(callback => callback()))
  await page.clock.runFor(160)
  await touchUp(left, id)
  await expect(left).not.toContainClass('fcitx-keyboard-pressed')
  expect(await getSentEvents(page)).toEqual([])
  await tap(page.locator('.fcitx-keyboard-editor-button-container').nth(2))
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowRight' },
    },
  ])
  await queued.dispose()
})

test('Ordinary CLEAR preserves a pending keyboard press', async ({ page }) => {
  const k = page.getByText('k(')
  const id = await touchDown(k)
  await sendSystemEvent(page, { type: 'CLEAR' })
  await touchUp(k, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

for (const trigger of ['start', 'end', 'actions'] as const) {
  test(`A synchronous session ABORT during ${trigger} dispatch retires the old gesture`, async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', error => errors.push(error))
    await page.evaluate(() => {
      const original = window.sentEvents.push.bind(window.sentEvents)
      window.sentEvents.push = (...events) => {
        const result = original(...events)
        if (events.some(event => event.type === 'KEY_DOWN')) {
          window.onMessage(JSON.stringify({ type: 'ABORT' }))
          // The host can synchronously start accepting input in a fresh session.
          const mask = document.querySelector('.fcitx-keyboard-mask')!
          const box = document.querySelector('.fcitx-keyboard-shift')!.getBoundingClientRect()
          const shift = new Touch({
            identifier: 0x7FFFFFFF,
            target: mask,
            clientX: box.x + box.width / 2,
            clientY: box.y + box.height / 2,
          })
          mask.dispatchEvent(new TouchEvent('touchstart', {
            touches: [...window.touches, shift],
            changedTouches: [shift],
            bubbles: true,
          }))
          mask.dispatchEvent(new TouchEvent('touchend', {
            touches: window.touches,
            changedTouches: [shift],
            bubbles: true,
          }))
        }
        return result
      }
    })
    const k = page.getByText('k(')
    if (trigger === 'start') {
      const first = await touchDown(k)
      const l = page.getByText('l)')
      const second = await touchDown(l)
      await touchUp(k, first)
      await touchUp(l, second)
    }
    else if (trigger === 'end') {
      const shift = page.locator('.fcitx-keyboard-shift')
      const heldShift = await touchDown(shift)
      const heldK = await touchDown(k)
      await touchUp(shift, heldShift)
      await touchUp(k, heldK)
    }
    else {
      await k.locator('..').evaluate((element) => {
        const key = JSON.parse(element.getAttribute('data-key')!)
        key.swipeUp.actions = [
          { type: 'key', key: '(' },
          { type: 'key', key: ')' },
        ]
        element.setAttribute('data-key', JSON.stringify(key))
      })
      const heldK = await touchDown(k)
      await touchMove(k, heldK, 0, -31)
      await touchUp(k, heldK)
    }
    expect(errors).toEqual([])
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: {
          key: trigger === 'start'
            ? 'k'
            : trigger === 'end'
              ? 'K'
              : '(',
          code: trigger === 'actions'
            ? ''
            : 'KeyK',
        },
      },
    ])
    await expect(k).toHaveText('K(')
  })
}

for (const command of ['Undo', 'Cut', 'Paste', 'ArrowLeft'] as const) {
  test(`Session ABORT discards a pending ${command} click and accepts a fresh press`, async ({ page }) => {
    if (command !== 'Undo') {
      await tap(getToolbarButton(page, 4))
      await sendSystemEvent(page, { type: 'SELECT' })
    }
    const button = command === 'Undo'
      ? getToolbarButton(page, 2)
      : page.locator('.fcitx-keyboard-editor-button-container').nth({ Cut: 5, Paste: 7, ArrowLeft: 0 }[command])
    const id = await touchDown(button)
    await sendSystemEvent(page, { type: 'ABORT' })
    const pressedAfterAbort = await button.evaluate(element => element.classList.contains('fcitx-keyboard-pressed'))
    await touchUp(button, id)
    expect(await getSentEvents(page)).toEqual([])
    expect(pressedAfterAbort).toBe(false)
    await tap(button)
    expect(await getSentEvents(page)).toEqual([
      command === 'ArrowLeft'
        ? {
            type: 'KEY_DOWN',
            data: { key: '', code: 'ArrowLeft' },
          }
        : {
            type: command.toUpperCase(),
          },
    ])
  })
}

for (const type of ['CLEAR', 'HIDE'] as const) {
  test(`Ordinary ${type} preserves a pending toolbar click`, async ({ page }) => {
    const undo = getToolbarButton(page, 2)
    const id = await touchDown(undo)
    await sendSystemEvent(page, { type })
    await touchUp(undo, id)
    expect(await getSentEvents(page)).toEqual([
      { type: 'UNDO' },
    ])
  })
}

test('An aborted bubbling start preserves a fresh pending swipe', async ({ page }) => {
  const freshId = 0x7FFFFFFE
  await page.evaluate((freshId) => {
    const original = window.sentEvents.push.bind(window.sentEvents)
    let aborted = false
    window.sentEvents.push = (...events) => {
      const result = original(...events)
      if (!aborted && events.some(event => event.type === 'KEY_DOWN')) {
        aborted = true
        window.onMessage(JSON.stringify({ type: 'ABORT' }))
        const mask = document.querySelector('.fcitx-keyboard-mask')!
        const key = Array.from(document.querySelectorAll('.fcitx-keyboard-key-container[data-key]'))
          .find(element => JSON.parse(element.getAttribute('data-key')!).code === 'KeyM')!
        const box = key.getBoundingClientRect()
        const freshTouch = new Touch({
          identifier: freshId,
          target: mask,
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
        })
        window.touches.push(freshTouch)
        mask.dispatchEvent(new TouchEvent('touchstart', {
          touches: window.touches,
          changedTouches: [freshTouch],
          bubbles: true,
        }))
      }
      return result
    }
  }, freshId)
  const k = page.getByText('k(')
  const l = page.getByText('l)')
  const first = await touchDown(k)
  const second = await touchDown(l)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
  await touchMove(k, freshId, 0, -31)
  await touchUp(k, first)
  await touchUp(l, second)
  await touchUp(k, freshId)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
    {
      type: 'KEY_DOWN',
      data: { key: '"', code: '' },
    },
  ])
})

test('An ordinary toolbar start still flushes a pending letter', async ({ page }) => {
  const k = page.getByText('k(')
  const undo = getToolbarButton(page, 2)
  const first = await touchDown(k)
  const second = await touchDown(undo)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
  await touchUp(k, first)
  await touchUp(undo, second)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
    { type: 'UNDO' },
  ])
})

test('An aborted toolbar release cannot complete or cancel a newer press', async ({ page }) => {
  const undo = getToolbarButton(page, 2)
  const old = await touchDown(undo)
  await sendSystemEvent(page, { type: 'ABORT' })
  const fresh = await touchDown(undo)
  await touchUp(undo, old)
  expect(await getSentEvents(page)).toEqual([])
  await touchUp(undo, fresh)
  expect(await getSentEvents(page)).toEqual([
    { type: 'UNDO' },
  ])
})

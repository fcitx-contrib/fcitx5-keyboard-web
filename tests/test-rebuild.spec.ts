import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE } from '../src/api.d'
import { getSentEvents, getToolbarButton, init, sendSystemEvent, tap, touchDown, touchMove, touchUp } from './util'

function rebuild(page: Page) {
  return page.evaluate(() => window.setBuiltInLayout('fcitx-app', 'qwerty'))
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

test('Rebuilding discards a pending letter and accepts a fresh press', async ({ page }) => {
  const k = page.getByText('k(')
  const id = await touchDown(k)
  await rebuild(page)
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

test('Rebuilding stops a held main Backspace repeat', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)
  await rebuild(page)
  await page.clock.runFor(400)
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

test('Rebuilding cancels a Backspace slide without completing its deletion', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await touchMove(backspace, id, -60, 0)
  await rebuild(page)
  await touchUp(backspace, id)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
  ])
})

test('Rebuilding clears held Shift and its double-tap pairing', async ({ page }) => {
  const shift = page.locator('.fcitx-keyboard-shift')
  const id = await touchDown(shift)
  await rebuild(page)
  await touchUp(shift, id)
  await tap(shift)
  const k = page.getByText('K(')
  await tap(k)
  await tap(page.getByText('k('))
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

test('Rebuilding rejects a pending old toolbar click', async ({ page }) => {
  const undo = getToolbarButton(page, 2)
  const id = await touchDown(undo)
  await rebuild(page)
  await touchUp(undo, id)
  expect(await getSentEvents(page)).toEqual([])
  await tap(undo)
  expect(await getSentEvents(page)).toEqual([
    { type: 'UNDO' },
  ])
})

test('Rebuilding clears a pending candidate long press', async ({ page }) => {
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
  await rebuild(page)
  await page.clock.runFor(400)
  await touchUp(candidate, id)
  expect(await getSentEvents(page)).toEqual([])
})

test('Rebuilding preserves the existing editor-repeat cleanup', async ({ page }) => {
  await tap(getToolbarButton(page, 4))
  const left = page.locator('.fcitx-keyboard-editor-button-container').nth(0)
  const id = await touchDown(left)
  await page.clock.runFor(380)
  expect(await getSentEvents(page)).toHaveLength(1)
  await rebuild(page)
  await page.clock.runFor(400)
  await touchUp(left, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowLeft' },
    },
  ])
  await tap(page.getByText('k('))
  expect(await getSentEvents(page)).toHaveLength(2)
})

test('A synchronous rebuild stops the old start and preserves fresh Shift', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', error => errors.push(error))
  await page.evaluate(() => {
    const original = window.sentEvents.push.bind(window.sentEvents)
    let rebuilt = false
    window.sentEvents.push = (...events) => {
      const result = original(...events)
      if (!rebuilt && events.some(event => event.type === 'KEY_DOWN')) {
        rebuilt = true
        window.setBuiltInLayout('fcitx-app', 'qwerty')
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
  const l = page.getByText('l)')
  const first = await touchDown(k)
  const second = await touchDown(l)
  await touchUp(k, first)
  await touchUp(l, second)
  expect(errors).toEqual([])
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
  await expect(k).toHaveText('K(')
})

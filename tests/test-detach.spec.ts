import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE, SCROLLING } from '../src/api.d'
import { getSentEvents, getToolbarButton, init, sendSystemEvent, tap, touchDown, touchMove, touchUp } from './util'

const errors = new WeakMap<Page, Error[]>()

function detach(page: Page) {
  return page.locator('.fcitx-keyboard-container').evaluate(element => element.remove())
}

function rebuild(page: Page) {
  return page.evaluate(() => window.setBuiltInLayout('fcitx-app', 'qwerty'))
}

test.beforeEach(async ({ page }) => {
  const caught: Error[] = []
  errors.set(page, caught)
  page.on('pageerror', error => caught.push(error))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Android' })
  })
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([])
})

for (const control of ['main Backspace', 'editor ArrowLeft'] as const) {
  test(`Removing the keyboard stops ${control} repeat without a release`, async ({ page }) => {
    if (control === 'editor ArrowLeft') {
      await tap(getToolbarButton(page, 4))
    }
    const key = control === 'main Backspace'
      ? page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
      : page.locator('.fcitx-keyboard-editor-button-container').nth(0)
    await touchDown(key)
    await page.clock.runFor(380)
    expect(await getSentEvents(page)).toHaveLength(1)
    await detach(page)
    await page.clock.runFor(400)
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: {
          key: '',
          code: control === 'main Backspace'
            ? 'Backspace'
            : 'ArrowLeft',
        },
      },
    ])
  })
}

test('A removed pending key cannot commit into a replacement keyboard', async ({ page }) => {
  const k = page.getByText('k(')
  const id = await touchDown(k)
  await detach(page)
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

test('A removed Backspace slide never completes its deletion', async ({ page }) => {
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const id = await touchDown(backspace)
  await touchMove(backspace, id, -60, 0)
  await detach(page)
  await rebuild(page)
  await touchUp(backspace, id)
  expect(await getSentEvents(page)).toEqual([
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
  ])
})

test('Removal retires held Shift before the next keyboard is initialized', async ({ page }) => {
  const shift = page.locator('.fcitx-keyboard-shift')
  const id = await touchDown(shift)
  await detach(page)
  await rebuild(page)
  await touchUp(shift, id)
  await tap(shift)
  await tap(page.getByText('k('))
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

test('Removal cancels a pending candidate long press', async ({ page }) => {
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
  await touchDown(page.locator('.fcitx-keyboard-candidate'))
  await page.clock.runFor(299)
  await detach(page)
  await page.clock.runFor(400)
  expect(await getSentEvents(page)).toEqual([])
})

test('A retired toolbar cannot dispatch after its old tree is reinserted', async ({ page }) => {
  const undo = getToolbarButton(page, 2)
  const id = await touchDown(undo)
  const old = await page.locator('.fcitx-keyboard-container').elementHandle()
  await detach(page)
  await page.evaluate(element => document.getElementById('fcitx-app')!.append(element!), old)
  await touchUp(undo, id)
  expect(await getSentEvents(page)).toEqual([])
  await rebuild(page)
  await tap(undo)
  expect(await getSentEvents(page)).toEqual([
    { type: 'UNDO' },
  ])
})

test('Moving a connected keyboard within one DOM operation preserves a pending key', async ({ page }) => {
  const k = page.getByText('k(')
  const id = await touchDown(k)
  await page.evaluate(() => {
    const container = document.querySelector('.fcitx-keyboard-container')!
    container.remove()
    document.getElementById('fcitx-app')!.append(container)
  })
  await touchUp(k, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

test('Synchronous removal during an action stops the rest of the dispatch', async ({ page }) => {
  await page.evaluate(() => {
    const original = window.sentEvents.push.bind(window.sentEvents)
    window.sentEvents.push = (...events) => {
      const result = original(...events)
      document.querySelector('.fcitx-keyboard-container')?.remove()
      return result
    }
  })
  const k = page.getByText('k(')
  await k.locator('..').evaluate((element) => {
    const key = JSON.parse(element.getAttribute('data-key')!)
    key.swipeUp.actions = [
      { type: 'key', key: '(' },
      { type: 'key', key: ')' },
    ]
    element.setAttribute('data-key', JSON.stringify(key))
  })
  const id = await touchDown(k)
  await touchMove(k, id, 0, -31)
  await touchUp(k, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '(', code: '' },
    },
  ])
})

test('A theme change after removal can be applied when a fresh keyboard mounts', async ({ page }) => {
  await detach(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(50)
  await rebuild(page)
  await expect(page.locator('.fcitx-keyboard-container')).toHaveClass(/fcitx-dark/)
})

test('A queued old removal cannot cancel a newly initialized pending key', async ({ page }) => {
  const freshId = 0x7FFFFFFE
  await page.evaluate((freshId) => {
    document.querySelector('.fcitx-keyboard-container')!.remove()
    window.setBuiltInLayout('fcitx-app', 'qwerty')
    const mask = document.querySelector('.fcitx-keyboard-mask')!
    const key = Array.from(document.querySelectorAll('.fcitx-keyboard-key-container[data-key]'))
      .find(element => JSON.parse(element.getAttribute('data-key')!).code === 'KeyK')!
    const box = key.getBoundingClientRect()
    const touch = new Touch({
      identifier: freshId,
      target: mask,
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    })
    window.touches = [touch]
    mask.dispatchEvent(new TouchEvent('touchstart', {
      touches: window.touches,
      changedTouches: [touch],
      bubbles: true,
    }))
  }, freshId)
  const k = page.getByText('k(')
  await touchUp(k, freshId)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'k', code: 'KeyK' },
    },
  ])
})

test('Removal releases key-background observation targets', async ({ page }) => {
  await page.addInitScript(() => {
    const targets = new Set<Element>()
    Object.defineProperty(window, 'observedBackgrounds', { value: targets })
    window.ResizeObserver = class {
      observe(target: Element) { targets.add(target) }
      unobserve(target: Element) { targets.delete(target) }
      disconnect() { targets.clear() }
    } as unknown as typeof ResizeObserver
  })
  await page.reload()
  expect(await page.evaluate(() => Reflect.get(window, 'observedBackgrounds').size)).toBeGreaterThan(0)
  await detach(page)
  expect(await page.evaluate(() => Reflect.get(window, 'observedBackgrounds').size)).toBe(0)
})

test('Synchronous removal after a shifted key retires the session before release cleanup', async ({ page }) => {
  await tap(page.locator('.fcitx-keyboard-shift'))
  await page.evaluate(() => {
    const original = window.sentEvents.push.bind(window.sentEvents)
    window.sentEvents.push = (...events) => {
      const result = original(...events)
      document.querySelector('.fcitx-keyboard-container')?.remove()
      return result
    }
  })
  const k = page.getByText('k(')
  await tap(k)
  expect(errors.get(page)).toEqual([])
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: 'K', code: 'KeyK' },
    },
  ])
})

async function expandBulkCandidates(page: Page) {
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      candidates: Array.from({ length: 85 }, (_, i) => ({ text: `词${i}`, label: '', comment: '' })),
      highlighted: 0,
      scrollState: SCROLLING,
      scrollStart: true,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
  await tap(page.locator('.fcitx-keyboard-candidate-bar .fcitx-keyboard-toolbar-button'))
}

test('A queued candidate scroll after removal cannot access missing paging buttons', async ({ page }) => {
  await expandBulkCandidates(page)
  await page.locator('.fcitx-keyboard-candidates').evaluate((list) => {
    // Model an element scroll event already queued when the host removes its tree.
    window.setTimeout(() => list.dispatchEvent(new Event('scroll')), 0)
    document.querySelector('.fcitx-keyboard-container')!.remove()
  })
  await page.clock.runFor(1)
  expect(await getSentEvents(page)).toEqual([])
})

test('A retired candidate scroll cannot change the new keyboard paging buttons', async ({ page }) => {
  await expandBulkCandidates(page)
  const old = await page.locator('.fcitx-keyboard-candidates').elementHandle()
  await detach(page)
  await rebuild(page)
  await expandBulkCandidates(page)
  const pageUp = page.locator('.fcitx-keyboard-side-button-container:nth-child(1)')
  await page.locator('.fcitx-keyboard-candidates').evaluate((list) => {
    list.scrollTop = 2
    list.dispatchEvent(new Event('scroll'))
  })
  await expect(pageUp).not.toContainClass('fcitx-keyboard-disabled')
  const disabledByOldScroll = await old!.evaluate((list) => {
    list.dispatchEvent(new Event('scroll'))
    return document.querySelector('.fcitx-keyboard-side-button-container:nth-child(1)')!
      .classList
      .contains('fcitx-keyboard-disabled')
  })
  expect(disabledByOldScroll).toBe(false)
  expect(await getSentEvents(page)).toEqual([])
})

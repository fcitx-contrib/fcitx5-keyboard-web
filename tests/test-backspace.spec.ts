import type { Page } from '@playwright/test'
import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { SCROLLING } from '../src/api.d'
import { getKey, getSentEvents, getToolbarButton, GRAY, init, sendSystemEvent, touchDown, touchMove, touchUp, WHITE } from './util'

type Surface = 'keyboard' | 'candidates' | 'editor'

async function initSurface(page: Page, surface: Surface) {
  await init(page)
  if (surface === 'editor') {
    await getToolbarButton(page, 3).tap()
    return page.locator('.fcitx-keyboard-editor-button-container').nth(8)
  }
  if (surface === 'candidates') {
    await sendSystemEvent(page, { type: 'CANDIDATES', data: {
      candidates: [{ text: '词', label: '', comment: '' }],
      highlighted: 0,
      scrollState: SCROLLING,
      scrollStart: true,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    } })
    await page.locator('.fcitx-keyboard-candidate-bar .fcitx-keyboard-toolbar-button').tap()
    return page.locator('.fcitx-keyboard-side-button-container').nth(2)
  }
  return page.locator('.fcitx-keyboard-backspace').locator('..')
}

for (const surface of ['keyboard', 'candidates', 'editor'] as const) {
  test.describe(surface, () => {
    test('Backspace', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      const visual = backspace.locator(':scope > div')
      await expect(visual).toHaveCSS('background-color', GRAY)

      const touchId = await touchDown(backspace)
      await expect(visual).toHaveCSS('background-color', WHITE)

      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([{
        type: 'KEY_DOWN',
        data: { key: '', code: 'Backspace' },
      }])
      await expect(visual).toHaveCSS('background-color', GRAY)
    })

    test('Slide', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      const visual = backspace.locator(':scope > div')
      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, -25, 0)
      await expect(visual).toHaveCSS('background-color', WHITE)
      await touchMove(backspace, touchId, 15, 0)
      await touchUp(backspace, touchId)
      await expect(visual).toHaveCSS('background-color', GRAY)

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
        const visual = backspace.locator(':scope > div')
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
        await expect(visual).toHaveCSS('background-color', WHITE)
        await expect(page.locator('.fcitx-keyboard-popover')).toBeHidden()

        await touchMove(backspace, touchId, -25, 0)
        await page.clock.runFor(80)
        expect(await getSentEvents(page)).toHaveLength(4)

        await touchUp(backspace, touchId, cancel)
        await page.clock.runFor(500)
        expect(await getSentEvents(page)).toHaveLength(4)
        await expect(visual).toHaveCSS('background-color', GRAY)
      })
    }

    test('Slide cancels long press', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)

      const touchId = await touchDown(backspace)
      await touchMove(backspace, touchId, -25, 0)
      await page.clock.runFor(1000)
      await touchUp(backspace, touchId)
      expect(await getSentEvents(page)).toEqual([
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
        { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
      ])
    })

    test('Another key stops repeated backspace', async ({ page }) => {
      const backspace = await initSurface(page, surface)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)

      const touchId = await touchDown(backspace)
      await page.clock.runFor(380)
      const q = surface === 'keyboard'
        ? getKey(page, 'q')
        : surface === 'editor'
          ? page.locator('.fcitx-keyboard-editor-button-container').nth(0)
          : page.locator('.fcitx-keyboard-side-button-container').nth(3)
      const qTouchId = await touchDown(q)
      await touchUp(q, qTouchId)
      await page.clock.runFor(500)
      await touchUp(backspace, touchId)
      await page.clock.runFor(500)
      expect(await getSentEvents(page)).toEqual(surface === 'keyboard'
        ? [
            { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
            { type: 'KEY_DOWN', data: { key: 'q', code: 'KeyQ' } },
          ]
        : [{ type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } }])
    })

    if (surface !== 'keyboard') {
      test('Native touch tap deletes once', async ({ page }) => {
        const backspace = await initSurface(page, surface)
        await backspace.tap()
        expect(await getSentEvents(page)).toEqual([
          { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
        ])
      })
    }
  })
}

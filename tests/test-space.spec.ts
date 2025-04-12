import type { Locator } from '@playwright/test'
import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { getSentEvents, GRAY, init, sendSystemEvent, tap, touchDown, touchMove, touchUp, WHITE } from './util'

async function getFontSize(locator: Locator) {
  const fontSize = await locator.evaluate(element => window.getComputedStyle(element).getPropertyValue('font-size'))
  return Number(fontSize.match(/^(\S+)px$/)![1])
}

test('Space', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  await sendSystemEvent(page, { type: 'INPUT_METHODS', data: {
    currentInputMethod: 'pinyin',
    inputMethods: [
      { name: 'keyboard-us', displayName: 'English' },
      { name: 'pinyin', displayName: '拼音' },
    ],
  } })
  await expect(space).toHaveText('拼音')

  await tap(space)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: {
      key: ' ',
      code: 'Space',
    },
  }])
})

test('Adjust font size', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  const longLabel = 'Long Long Long Long Long'
  await sendSystemEvent(page, { type: 'INPUT_METHODS', data: {
    currentInputMethod: 'long',
    inputMethods: [
      { name: 'long', displayName: longLabel },
    ],
  } })
  await expect(space).toHaveText(longLabel)
  const fontSize = await getFontSize(space)
  expect(fontSize).toBeLessThan(12)

  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  await expect(space, 'Label preserved on layer change').toHaveText(longLabel)
  expect(await getFontSize(space), 'Font size preserved on layer change').toEqual(fontSize)
})

test('Continuous slide', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  const touchId = await touchDown(space)
  await touchMove(space, touchId, -5, 0)
  expect(await getSentEvents(page)).toEqual([])

  await touchMove(space, touchId, -7, 0)
  await touchMove(space, touchId, -9, 0)
  const leftEvent: VirtualKeyboardEvent = { type: 'KEY_DOWN', data: { key: '', code: 'ArrowLeft' } }
  const rightEvent: VirtualKeyboardEvent = { type: 'KEY_DOWN', data: { key: '', code: 'ArrowRight' } }
  const sentEvents: VirtualKeyboardEvent[] = [leftEvent, leftEvent]
  expect(await getSentEvents(page)).toEqual(sentEvents)

  await touchMove(space, touchId, 9, 0)
  expect(await getSentEvents(page), 'Cumulative 21 to the left is reset to 0, so 9 to the right doesn\'t trigger.').toEqual(sentEvents)

  await touchMove(space, touchId, 1, 0)
  sentEvents.push(rightEvent)
  expect(await getSentEvents(page)).toEqual(sentEvents)

  await touchMove(space, touchId, 23, 0)
  sentEvents.push(rightEvent, rightEvent)
  expect(await getSentEvents(page), 'A big step.').toEqual(sentEvents)

  await touchUp(space, touchId)
  expect(await getSentEvents(page), 'No space key event.').toEqual(sentEvents)
})

test('Continuous slide shouldn\'t be interrupted by setCandidates', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  const touchId = await touchDown(space)
  await expect(space).toHaveCSS('background-color', GRAY)

  await touchMove(space, touchId, -15, 0)
  await expect(space).toHaveCSS('background-color', GRAY)

  // When preedit exists, sliding space may move cursor thus change candidates.
  await sendSystemEvent(page, { type: 'CANDIDATES', data: { highlighted: 0, candidates: [{
    text: '一',
    label: '1',
    comment: '',
  }] } })
  await expect(space).toHaveCSS('background-color', GRAY)

  await touchUp(space, touchId)
  await expect(space).toHaveCSS('background-color', WHITE)
})

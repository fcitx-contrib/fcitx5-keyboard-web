import type { VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent, tap, touchDown, touchMove, touchUp } from './util'

test('Space', async ({ page }) => {
  await init(page)

  const space = page.locator('.fcitx-keyboard-space')
  await sendSystemEvent(page, { type: 'STATUS_AREA', data: {
    actions: [],
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

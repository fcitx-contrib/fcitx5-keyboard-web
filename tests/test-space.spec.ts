import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent, tap } from './util'

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

import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent, touchDown, touchMove, touchUp } from './util'

test.beforeEach(async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

for (const type of ['globe', 'enter'] as const) {
  for (const [dx, dy] of [
    [5, 0],
    [30, 30],
    [-30, -30],
  ]) {
    test(`${type} movement (${dx}, ${dy}) remains tappable through the 30px axis boundary`, async ({ page }) => {
      const key = page.locator(`.fcitx-keyboard .fcitx-keyboard-${type}`)
      const id = await touchDown(key)
      await touchMove(key, id, dx, dy)
      expect(await getSentEvents(page)).toEqual([])
      await touchUp(key, id)
      expect(await getSentEvents(page)).toEqual(type === 'globe'
        ? [
            { type: 'GLOBE' },
          ]
        : [
            {
              type: 'KEY_DOWN',
              data: { key: '\r', code: 'Enter' },
            },
          ])
    })
  }

  for (const [dx, dy] of [
    [31, 0],
    [0, -31],
  ]) {
    test(`${type} movement (${dx}, ${dy}) latches cancellation beyond 30px`, async ({ page }) => {
      const key = page.locator(`.fcitx-keyboard .fcitx-keyboard-${type}`)
      const id = await touchDown(key)
      await touchMove(key, id, dx, dy)
      await touchMove(key, id, -dx, -dy)
      await page.clock.runFor(400)
      await expect(page.locator('.fcitx-keyboard-contextmenu')).toBeHidden()
      await touchUp(key, id)
      expect(await getSentEvents(page)).toEqual([])
    })
  }
}

test('Globe drift through 30px preserves the menu at exactly 300ms', async ({ page }) => {
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'keyboard-us',
      inputMethods: [
        { name: 'keyboard-us', displayName: 'English' },
      ],
    },
  })
  const globe = page.locator('.fcitx-keyboard .fcitx-keyboard-globe')
  const id = await touchDown(globe)
  await touchMove(globe, id, 5, 0)
  await touchMove(globe, id, 25, -30)
  await page.clock.runFor(299)
  const menu = page.locator('.fcitx-keyboard-contextmenu')
  await expect(menu).toBeHidden()
  await page.clock.runFor(1)
  await expect(menu.getByText('English')).toBeVisible()
  await touchUp(globe, id)
  expect(await getSentEvents(page), 'Long press must not emit the ordinary globe tap').toEqual([])
})

test('Holding Enter retains its existing ordinary release behavior', async ({ page }) => {
  const enter = page.locator('.fcitx-keyboard .fcitx-keyboard-enter')
  const id = await touchDown(enter)
  await page.clock.runFor(400)
  await touchUp(enter, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '\r', code: 'Enter' },
    },
  ])
})

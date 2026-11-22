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

for (const { label, selector, numberFirst } of [
  { label: 'main Enter', selector: '.fcitx-keyboard-enter', numberFirst: false },
  { label: 'numpad Enter', selector: '.fcitx-keyboard-numpad-enter', numberFirst: true },
  { label: 'Globe', selector: '.fcitx-keyboard-globe', numberFirst: false },
  { label: '#+=', selector: '.fcitx-keyboard-symbol', numberFirst: false },
]) {
  test(`Switching input type cancels a held ${label} from the previous panel`, async ({ page }) => {
    if (numberFirst) {
      await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'number' })
    }
    const key = page.locator(selector)
    const id = await touchDown(key)
    const nextType = numberFirst ? 'text' : 'number'
    await sendSystemEvent(page, { type: 'INPUT_TYPE', data: nextType })
    await touchUp(key, id)
    expect(await getSentEvents(page)).toEqual([])
  })
}

test('Switching input type dismisses the Globe menu and invalidates old items', async ({ page }) => {
  await sendSystemEvent(page, {
    type: 'INPUT_METHODS',
    data: {
      currentInputMethod: 'keyboard-us',
      inputMethods: [
        { name: 'keyboard-us', displayName: 'English' },
        { name: 'pinyin', displayName: 'Pinyin' },
      ],
    },
  })
  const globe = page.locator('.fcitx-keyboard-globe')
  const id = await touchDown(globe)
  await page.clock.runFor(300)
  await touchUp(globe, id)
  const item = page.locator('.fcitx-keyboard-contextmenu').getByText('Pinyin')
  await expect(item).toBeVisible()
  const old = await item.elementHandle()

  await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'number' })
  const oldMenuVisible = await item.isVisible()
  // The old item may already have a selection event queued.
  await old!.evaluate(element => (element as HTMLElement).click())
  expect({ oldMenuVisible, events: await getSentEvents(page) }).toEqual({ oldMenuVisible: false, events: [] })
})

test('Switching input type clears the 123 preview before the symbol touch ends', async ({ page }) => {
  const symbol = page.locator('.fcitx-keyboard-symbol')
  const id = await touchDown(symbol)
  await touchMove(symbol, id, 0, -31)
  const preview = page.locator('.fcitx-keyboard-popover')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveText('123')

  await sendSystemEvent(page, { type: 'INPUT_TYPE', data: 'number' })
  expect(await preview.isVisible()).toBe(false)
  await touchUp(symbol, id)
})

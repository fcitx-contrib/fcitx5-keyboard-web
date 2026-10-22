import test, { expect } from '@playwright/test'
import { getKeyBackground, getSentEvents, init, tap, touchDown, touchMove, touchUp } from './util'

for (const [dx, dy] of [[0, -5], [0, -9], [5, 0], [0, 5], [9, -9]]) {
  test(`Movement (${dx}, ${dy}) keeps the preview and commits the letter`, async ({ page }) => {
    await init(page)
    const e = page.getByText('e3')
    const touchId = await touchDown(e)
    await touchMove(e, touchId, dx, dy)
    await expect(page.locator('.fcitx-keyboard-popover')).toBeVisible()
    await expect(page.locator('.fcitx-keyboard-popover')).toHaveText('e')
    expect(await getSentEvents(page)).toEqual([])
    await touchUp(e, touchId)
    expect(await getSentEvents(page)).toEqual([{
      type: 'KEY_DOWN',
      data: { key: 'e', code: 'KeyE' },
    }])
  })
}

for (const [dx, dy] of [[10, 0], [0, 10]]) {
  test(`Movement (${dx}, ${dy}) cancels the preview and input`, async ({ page }) => {
    await init(page)
    const e = page.getByText('e3')
    const touchId = await touchDown(e)
    await touchMove(e, touchId, dx, dy)
    await expect(page.locator('.fcitx-keyboard-popover')).not.toBeVisible()
    await touchUp(e, touchId)
    expect(await getSentEvents(page)).toEqual([])
  })
}

test('Keep the preview visible while approaching the swipe threshold', async ({ page }) => {
  await init(page)
  const e = page.getByText('e3')
  const touchId = await touchDown(e)
  // Include horizontal drift to cover a diagonal approach to the threshold.
  await touchMove(e, touchId, 5, 0)
  const label = page.locator('.fcitx-keyboard-popover')
  const background = getKeyBackground(e)
  const path = await background.locator('path').getAttribute('d')
  const labelElement = await label.elementHandle()
  const mutations = await background.evaluateHandle((element) => {
    const records: MutationRecord[] = []
    const observer = new MutationObserver(changes => records.push(...changes))
    observer.observe(element.parentElement!, { attributes: true, subtree: true })
    return { records, observer }
  })

  // A gradual swipe remains a tap until it reaches the swipe threshold.
  for (const dy of [-2, -2, -5]) {
    await touchMove(e, touchId, 0, dy)
    await expect(label).toBeVisible()
    await expect(label).toHaveText('e')
    await expect(background).toContainClass('fcitx-keyboard-popover-background')
    await expect(background.locator('path')).toHaveAttribute('d', path!)
    expect(await label.evaluate((element, original) => element === original, labelElement)).toBe(true)
  }

  await touchMove(e, touchId, 0, -1)
  await expect(label).toBeVisible()
  await expect(label).toHaveText('3')
  await expect(background.locator('path')).toHaveAttribute('d', path!)
  expect(await label.evaluate((element, original) => element === original, labelElement)).toBe(true)

  // Continuing above the threshold must not rebuild the label on each event.
  await touchMove(e, touchId, 0, -5)
  expect(await label.evaluate((element, original) => element === original, labelElement)).toBe(true)
  await expect(label).toHaveText('3')
  expect(await mutations.evaluate(({ records, observer }) => {
    records.push(...observer.takeRecords())
    observer.disconnect()
    return records.length
  })).toBe(0)
  await mutations.dispose()
  await touchUp(e, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '3', code: 'Digit3' },
  }])
})

test('Swipe up', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  await expect(popover).not.toBeVisible()

  const y = page.getByText('y6')
  const touchId = await touchDown(y)
  await touchMove(y, touchId, 5, -15)
  await expect(popover).toBeVisible()
  await expect(popover).toHaveText('6')
  await expect(page.locator('.fcitx-keyboard-popover-background path')).toHaveCount(1)

  await touchUp(y, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: '6', code: 'Digit6' },
  }])
})

test('Cancel', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  const t = page.getByText('t5')
  const touchId = await touchDown(t)
  await touchMove(t, touchId, 5, -15)
  await expect(popover).toBeVisible()

  await touchMove(t, touchId, 0, 15)
  await expect(popover).not.toBeVisible()
  await touchUp(t, touchId)
  expect(await getSentEvents(page)).toEqual([])
})

test('Reset layer', async ({ page }) => {
  await init(page)

  const shift = page.locator('.fcitx-keyboard-shift')
  await tap(shift)
  const h = page.getByText('h/')
  await expect(h).toHaveText('H/')
  const touchId = await touchDown(h)
  await touchMove(h, touchId, 0, -10)
  await touchUp(h, touchId)
  await expect(h).toHaveText('h/')
})

test('Interrupted', async ({ page }) => {
  await init(page)

  const popover = page.locator('.fcitx-keyboard-popover')
  const i = page.getByText('i8')
  const y = page.getByText('y6')
  const touchId = await touchDown(y)
  await touchMove(y, touchId, 5, -15)
  await touchDown(i)
  await expect(popover).not.toBeVisible()

  await touchUp(y, touchId)
  expect(await getSentEvents(page)).toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'i', code: 'KeyI' },
  }])
})

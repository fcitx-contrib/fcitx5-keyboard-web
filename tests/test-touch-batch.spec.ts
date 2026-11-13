import { expect, test } from '@playwright/test'
import { getKey, getSentEvents, init, touchDown, touchDownTogether, touchMoveTogether, touchUp, touchUpTogether } from './util'

test.beforeEach(async ({ page }) => {
  await init(page)
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
})

test('Batched ordinary starts preserve ordered commit and leave the last key pending', async ({ page }) => {
  const q = getKey(page, 'q')
  const w = getKey(page, 'w')
  const ids = await touchDownTogether([q, w])
  const qEvent = {
    type: 'KEY_DOWN',
    data: { key: 'q', code: 'KeyQ' },
  }
  expect(await getSentEvents(page), 'The bubbling container must not commit w from the same batch').toEqual([qEvent])

  await touchUpTogether(q, ids)
  expect(await page.evaluate(() => window.touches)).toEqual([])
  expect(await getSentEvents(page)).toEqual([
    qEvent,
    {
      type: 'KEY_DOWN',
      data: { key: 'w', code: 'KeyW' },
    },
  ])
})

test('Both slide keys in a batched start are tracked through movement and release', async ({ page }) => {
  const space = page.locator('.fcitx-keyboard-space')
  const backspace = page.locator('.fcitx-keyboard .fcitx-keyboard-backspace')
  const [spaceId, backspaceId] = await touchDownTogether([space, backspace])
  expect(await getSentEvents(page)).toEqual([])
  await touchMoveTogether(space, [
    { touchId: spaceId, dx: 45, dy: 0 },
    { touchId: backspaceId, dx: -45, dy: 0 },
  ])
  await touchUpTogether(space, [spaceId, backspaceId])
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowRight' },
    },
    { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    { type: 'BACKSPACE_SLIDE', data: 'RELEASE' },
  ])
})

for (const type of ['space', 'backspace'] as const) {
  test(`Batched move processes ${type} after an ordinary touch`, async ({ page }) => {
    const q = getKey(page, 'q')
    const slideKey = page.locator(`.fcitx-keyboard .fcitx-keyboard-${type}`)
    const qId = await touchDown(q)
    const slideId = await touchDown(slideKey)
    await touchMoveTogether(q, [
      { touchId: qId, dx: 0, dy: 0 },
      { touchId: slideId, dx: -45, dy: 0 },
    ])
    const expected = [
      {
        type: 'KEY_DOWN',
        data: { key: 'q', code: 'KeyQ' },
      },
      type === 'space'
        ? {
            type: 'KEY_DOWN',
            data: { key: '', code: 'ArrowLeft' },
          }
        : { type: 'BACKSPACE_SLIDE', data: 'LEFT' },
    ]
    expect(await getSentEvents(page)).toEqual(expected)
    await touchUpTogether(q, [qId, slideId])
    expect(await getSentEvents(page)).toHaveLength(expected.length + (type === 'backspace'
      ? 1
      : 0))
  })
}

for (const reverse of [false, true]) {
  test(`Touches moved in the same batch do not interrupt each other (reverse=${reverse})`, async ({ page }) => {
    const q = getKey(page, 'q')
    const w = getKey(page, 'w')
    const [qId, wId] = await touchDownTogether([q, w])
    const moves = [
      { touchId: qId, dx: 0, dy: 0 },
      { touchId: wId, dx: 0, dy: -31 },
    ]
    await touchMoveTogether(q, reverse
      ? moves.reverse()
      : moves)
    expect(await getSentEvents(page), 'Only q was committed at the second touch start; w must remain a swipe').toEqual([
      {
        type: 'KEY_DOWN',
        data: { key: 'q', code: 'KeyQ' },
      },
    ])
    if (reverse) {
      // Separate events keep the existing swipe-first release behavior.
      await touchUp(w, wId)
      await touchUp(q, qId)
    }
    else {
      // The sent key must not interrupt the active swipe in the same end batch.
      await touchUpTogether(q, [qId, wId])
    }
    expect(await getSentEvents(page)).toEqual([
      {
        type: 'KEY_DOWN',
        data: { key: 'q', code: 'KeyQ' },
      },
      {
        type: 'KEY_DOWN',
        data: { key: '2', code: 'Digit2' },
      },
    ])
  })
}

test('An unknown first changed touch does not skip a later valid move', async ({ page }) => {
  const space = page.locator('.fcitx-keyboard-space')
  const id = await touchDown(space)
  await page.evaluate((id) => {
    const i = window.touches.findIndex(touch => touch.identifier === id)
    const original = window.touches[i]
    const current = new Touch({
      identifier: id,
      target: original.target,
      clientX: original.clientX - 45,
      clientY: original.clientY,
    })
    window.touches[i] = current
    const stale = new Touch({
      identifier: -1,
      target: original.target,
      clientX: 0,
      clientY: 0,
    })
    original.target.dispatchEvent(new TouchEvent('touchmove', {
      touches: window.touches,
      changedTouches: [stale, current],
      bubbles: true,
    }))
  }, id)
  await touchUp(space, id)
  expect(await getSentEvents(page)).toEqual([
    {
      type: 'KEY_DOWN',
      data: { key: '', code: 'ArrowLeft' },
    },
  ])
})

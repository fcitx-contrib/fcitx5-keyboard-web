import type { Page } from '@playwright/test'
import type { SystemEvent, VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE, SCROLLING } from '../src/api.d'
import { getSentEvents, init, longPress, sendSystemEvent, tap } from './util'

function getCandidateBar(page: Page) {
  return page.locator('.fcitx-keyboard-candidates')
}

function generateCandidates(start: number, count: number) {
  const candidates = []
  for (let i = 0; i < count; ++i) {
    candidates.push({ text: `词${(start + i).toString()}`, label: '', comment: '' })
  }
  return candidates
}

test('Show and clear', async ({ page }) => {
  await init(page)

  const toolbar = page.locator('.fcitx-keyboard-toolbar')
  const candidateBar = getCandidateBar(page)
  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [
      { text: '一', label: '1', comment: '' },
      { text: '1️⃣', label: '2', comment: '' },
    ],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } })
  await expect(candidateBar.locator('.fcitx-keyboard-candidate')).toHaveCount(2)
  await expect(toolbar).not.toBeVisible()

  await sendSystemEvent(page, { type: 'CLEAR' })
  await expect(candidateBar).not.toBeVisible()
  await expect(toolbar).toBeVisible()
})

test('Select', async ({ page }) => {
  await init(page)

  const candidateBar = getCandidateBar(page)
  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [
      { text: '一', label: '1', comment: '' },
      { text: '1️⃣', label: '2', comment: '' },
    ],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } })

  const firstCandidate = candidateBar.locator('.fcitx-keyboard-candidate').first()
  await firstCandidate.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'SELECT_CANDIDATE',
    data: 0,
  }])
})

test('Overflow', async ({ page }) => {
  await init(page)

  const event: SystemEvent = { type: 'CANDIDATES', data: {
    candidates: [{ text: '长长长长长长长长长长长长长长长长长长长长长长长长长长长长', label: '', comment: '' }],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } }
  const candidate = getCandidateBar(page).locator('.fcitx-keyboard-candidate')
  await sendSystemEvent(page, event)
  const initialBox = (await candidate.boundingBox())!
  expect(initialBox.width).toBeGreaterThan(page.viewportSize()!.width)

  await page.evaluate(() => document.querySelector('.fcitx-keyboard-candidates')?.scrollBy(20, 0))
  const intermediateBox = (await candidate.boundingBox())!
  expect(intermediateBox.x).toEqual(initialBox.x - 20)

  await sendSystemEvent(page, event)
  const finalBox = (await candidate.boundingBox())!
  expect(finalBox.x).toEqual(initialBox.x)
})

test('Actions', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [{ text: '一', label: '1', comment: '' }],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } })
  const candidate = page.locator('.fcitx-keyboard-candidate')
  await longPress(candidate)
  const sentEvents: VirtualKeyboardEvent[] = [{ type: 'ASK_CANDIDATE_ACTIONS', data: 0 }]
  expect(await getSentEvents(page)).toEqual(sentEvents)

  await sendSystemEvent(page, { type: 'CANDIDATE_ACTIONS', data: {
    index: 0,
    actions: [{ id: 1, text: '置顶' }, { id: 2, text: '删词' }],
  } })
  const deleteButton = page.getByText('删词')
  await deleteButton.tap()
  await expect(deleteButton).not.toBeVisible()
  sentEvents.push({ type: 'CANDIDATE_ACTION', data: { index: 0, id: 2 } })
  expect(await getSentEvents(page)).toEqual(sentEvents)
})

test('Actions disappear on clear', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [{ text: '一', label: '1', comment: '' }],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } })
  await sendSystemEvent(page, { type: 'CANDIDATE_ACTIONS', data: {
    index: 0,
    actions: [{ id: 1, text: '置顶' }],
  } })
  const pinButton = page.getByText('置顶')
  await expect(pinButton).toBeVisible()

  await sendSystemEvent(page, { type: 'CLEAR' })
  await expect(pinButton).not.toBeVisible()
})

test('Preedit', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'PREEDIT', data: {
    auxUp: 'Quick Phrase: ',
    preedit: 'vah',
  } })
  const preedit = page.locator('.fcitx-keyboard-preedit')
  await expect(preedit).toHaveText('Quick Phrase: vah')
  const box = (await preedit.boundingBox())!
  const { y } = (await page.locator('#fcitx-app').boundingBox())!
  expect(box.y).toEqual(y)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: [{ text: '一', label: '1', comment: '' }],
    highlighted: 0,
    scrollState: SCROLL_NONE,
    scrollStart: false,
    scrollEnd: false,
  } })
  const newBox = (await preedit.boundingBox())!
  expect(newBox, 'No layout shift').toEqual(box)
})

test('Horizontal scroll', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: generateCandidates(0, 20),
    highlighted: 0,
    scrollState: SCROLLING,
    scrollStart: true,
    scrollEnd: false,
  } })
  const candidates = page.locator('.fcitx-keyboard-candidates')
  await candidates.evaluate(element => element.scrollBy(element.lastElementChild!.getBoundingClientRect().right, 0))
  // There is a maybe more than 100ms delay before event is emitted.
  while (true) {
    const sentEvents = await getSentEvents(page)
    if (JSON.stringify(sentEvents) === JSON.stringify([{ type: 'SCROLL', data: { start: 20, count: 20 } }])) {
      break
    }
  }

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: generateCandidates(20, 10),
    highlighted: -1,
    scrollState: SCROLLING,
    scrollStart: false,
    scrollEnd: true,
  } })
  const candidate = candidates.locator('.fcitx-keyboard-candidate')
  await expect(candidate).toHaveCount(30)

  await candidates.evaluate(element => element.scrollBy(element.lastElementChild!.getBoundingClientRect().right, 0))
  const lastCandidate = candidate.last()
  await longPress(lastCandidate)
  await tap(lastCandidate)
  expect(await getSentEvents(page), 'Only one scroll event').toEqual([
    { type: 'SCROLL', data: { start: 20, count: 20 } },
    { type: 'ASK_CANDIDATE_ACTIONS', data: 29 },
    { type: 'SELECT_CANDIDATE', data: 29 },
  ])
})

function expandOrCollapse(page: Page) {
  return page.locator('.fcitx-keyboard-candidate-bar .fcitx-keyboard-toolbar-button').click()
}

test('Expand/collapse', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: generateCandidates(0, 60),
    highlighted: 0,
    scrollState: SCROLLING,
    scrollStart: true,
    scrollEnd: false,
  } })
  const c29 = page.getByText('词29')
  await expect(c29).not.toBeInViewport()

  await expandOrCollapse(page)
  await expect(c29).toBeInViewport()

  await page.locator('.fcitx-keyboard-side-button-container:nth-child(3)').click()
  await page.locator('.fcitx-keyboard-side-button-container:nth-child(4)').click()

  expect(await getSentEvents(page)).toEqual([
    { type: 'KEY_DOWN', data: { key: '', code: 'Backspace' } },
    { type: 'KEY_DOWN', data: { key: '\r', code: 'Enter' } },
  ])

  await expandOrCollapse(page)
  await expect(c29).not.toBeInViewport()
})

test('Vertical scroll', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: generateCandidates(0, 60),
    highlighted: 0,
    scrollState: SCROLLING,
    scrollStart: true,
    scrollEnd: false,
  } })
  await expandOrCollapse(page)

  await page.evaluate(() => document.querySelector('.fcitx-keyboard-candidates')?.scrollBy({ top: 240 }))
  // There is a maybe more than 100ms delay before event is emitted.
  while (true) {
    const sentEvents = await getSentEvents(page)
    if (JSON.stringify(sentEvents) === JSON.stringify([{ type: 'SCROLL', data: { start: 60, count: 25 } }])) {
      break
    }
  }
})

test('Paging button', async ({ page }) => {
  await init(page)

  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    candidates: generateCandidates(0, 85),
    highlighted: 0,
    scrollState: SCROLLING,
    scrollStart: true,
    scrollEnd: true,
  } })
  await expandOrCollapse(page)
  const top = (await page.getByText('词0').boundingBox())!.y

  const pageUp = page.locator('.fcitx-keyboard-side-button-container:nth-child(1)')
  const pageDown = page.locator('.fcitx-keyboard-side-button-container:nth-child(2)')
  await expect(pageUp).toContainClass('fcitx-keyboard-disabled')
  await expect(pageDown).not.toContainClass('fcitx-keyboard-disabled')

  const candidates = page.locator('.fcitx-keyboard-candidates')
  await candidates.evaluate(element => element.scrollBy({ top: 1 }))
  expect(await candidates.evaluate(element => element.scrollTop)).toEqual(1)
  await expect(pageUp, 'Slight scroll down counts').not.toContainClass('fcitx-keyboard-disabled')

  await pageUp.click()
  await expect(pageUp).toContainClass('fcitx-keyboard-disabled')

  await pageDown.click()
  while (Math.abs((await page.getByText('词25').boundingBox())!.y - top) >= 0.5);
  await expect(pageDown).not.toContainClass('fcitx-keyboard-disabled')

  await pageDown.click()
  while (Math.abs((await page.getByText('词50').boundingBox())!.y - top) >= 0.5);

  await pageUp.click()
  while (Math.abs((await page.getByText('词25').boundingBox())!.y - top) >= 0.5);

  await pageDown.click()
  // Already asserted but still needed to make sure next pageDown has effect.
  while (Math.abs((await page.getByText('词50').boundingBox())!.y - top) >= 0.5);

  await pageDown.click()
  await expect(pageDown).toContainClass('fcitx-keyboard-disabled')
  const c59Box = (await page.getByText('词84').boundingBox())!
  const { height } = page.viewportSize()!
  expect(Math.abs(c59Box.y + c59Box.height - height)).toBeLessThan(0.5)

  await candidates.evaluate(element => element.scrollBy({ top: -2 })) // Not sure why -1 doesn't work in headless mode.
  await expect(pageDown, 'Slight scroll up counts').not.toContainClass('fcitx-keyboard-disabled')

  await pageDown.click()
  await expect(pageDown).toContainClass('fcitx-keyboard-disabled')
})

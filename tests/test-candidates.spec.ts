import type { Page } from '@playwright/test'
import type { SystemEvent, VirtualKeyboardEvent } from '../src/api'
import { expect, test } from '@playwright/test'
import { getSentEvents, init, longPress, sendSystemEvent } from './util'

function getCandidateBar(page: Page) {
  return page.locator('.fcitx-keyboard-candidates')
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

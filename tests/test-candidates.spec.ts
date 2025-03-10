import { expect, test } from '@playwright/test'
import { getSentEvents, init, sendSystemEvent } from './util'

test('Show and clear', async ({ page }) => {
  await init(page)

  const toolbar = page.locator('.fcitx-keyboard-toolbar')
  const candidateBar = page.locator('.fcitx-keyboard-candidates')
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

  const candidateBar = page.locator('.fcitx-keyboard-candidates')
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

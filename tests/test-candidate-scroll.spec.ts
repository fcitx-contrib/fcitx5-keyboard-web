import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE, SCROLLING } from '../src/api.d'
import { getBox, init, sendSystemEvent } from './util'

function candidates(count: number) {
  return Array.from({ length: count }, (_, i) => ({ text: `候选词${i}`, label: '', comment: '' }))
}

async function expectFullyVisible(page: Page, index: number) {
  await expect.poll(async () => {
    const list = page.locator('.fcitx-keyboard-candidates')
    const viewport = await getBox(list)
    const candidate = await getBox(list.locator('.fcitx-keyboard-candidate').nth(index))
    return candidate.x >= viewport.x && candidate.x + candidate.width <= viewport.x + viewport.width
  }).toBe(true)
}

for (const bulk of [false, true]) {
  const mode = bulk ? 'bulk' : 'non-bulk'

  test(`${mode} horizontal highlight reveals clipped and hidden candidates`, async ({ page }) => {
    await init(page)
    const list = page.locator('.fcitx-keyboard-candidates')
    let generation = 0
    const update = (highlighted: number, items = candidates(30)) => sendSystemEvent(page, { type: 'CANDIDATES', data: {
      inputContext: 'context',
      generation: ++generation,
      candidates: items,
      highlighted,
      scrollState: bulk ? SCROLLING : SCROLL_NONE,
      scrollStart: bulk,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    } })

    await update(-1)
    const clipped = await list.evaluate((element) => {
      const viewport = element.getBoundingClientRect()
      return Array.from(element.children).findIndex((child) => {
        const candidate = child.getBoundingClientRect()
        return candidate.left < viewport.right && candidate.right > viewport.right + 1
      })
    })
    expect(clipped).toBeGreaterThan(0)
    await update(clipped)
    await expectFullyVisible(page, clipped)
    await update(17)
    await expectFullyVisible(page, 17)
    await update(29)
    await expectFullyVisible(page, 29)
    await update(0)
    await expectFullyVisible(page, 0)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    const items = candidates(30)
    items[10].text = 'W'.repeat(120)
    await update(10, items)
    const viewport = await getBox(list)
    const wide = await getBox(list.locator('.fcitx-keyboard-candidate').nth(10))
    expect(wide.width).toBeGreaterThan(viewport.width)
    expect(Math.abs(wide.x - viewport.x)).toBeLessThanOrEqual(1)
  })
}

test('appending bulk candidates preserves horizontal scrolling', async ({ page }) => {
  await init(page)
  const list = page.locator('.fcitx-keyboard-candidates')
  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    inputContext: 'context',
    generation: 1,
    candidates: candidates(30),
    highlighted: 0,
    scrollState: SCROLLING,
    scrollStart: true,
    scrollEnd: true,
    hasClientPreedit: true,
    tabActions: [],
  } })
  await list.evaluate(element => element.scrollTo({ left: 400 }))
  const before = await list.evaluate(element => element.scrollLeft)
  expect(before).toBeGreaterThan(0)
  await sendSystemEvent(page, { type: 'CANDIDATES', data: {
    inputContext: 'context',
    generation: 1,
    candidates: candidates(10),
    highlighted: -1,
    scrollState: SCROLLING,
    scrollStart: false,
    scrollEnd: true,
    hasClientPreedit: true,
    tabActions: [],
  } })
  expect(await list.evaluate(element => element.scrollLeft)).toBe(before)
})

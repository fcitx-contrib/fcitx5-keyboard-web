import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { SCROLL_NONE, SCROLLING } from '../src/api.d'
import { getBox, init, sendSystemEvent, tap } from './util'

function candidates(count: number) {
  return Array.from({ length: count }, (_, i) => ({ text: `候选词${i}`, label: '', comment: '' }))
}

async function repeatRelativeScrollRequests(page: Page) {
  // Model iOS replaying a relative scroll request on the scrolling thread.
  await page.addInitScript(() => {
    const scrollBy: (this: Element, options: ScrollToOptions) => void = Element.prototype.scrollBy
    Element.prototype.scrollBy = function (x?: number | ScrollToOptions, y?: number) {
      const options = typeof x === 'number'
        ? { left: x, top: y ?? 0 }
        : x ?? {}
      scrollBy.call(this, options)
      requestAnimationFrame(() => scrollBy.call(this, options))
    }
  })
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
    await repeatRelativeScrollRequests(page)
    await init(page)
    const list = page.locator('.fcitx-keyboard-candidates')
    let generation = 0
    const update = (highlighted: number, items = candidates(30)) => sendSystemEvent(page, {
      type: 'CANDIDATES',
      data: {
        inputContext: 'context',
        generation: ++generation,
        candidates: items,
        highlighted,
        scrollState: bulk ? SCROLLING : SCROLL_NONE,
        scrollStart: bulk,
        scrollEnd: true,
        hasClientPreedit: true,
        tabActions: [],
      },
    })

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
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      candidates: candidates(30),
      highlighted: 0,
      scrollState: SCROLLING,
      scrollStart: true,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
  await list.evaluate(element => element.scrollTo({ left: 400 }))
  const before = await list.evaluate(element => element.scrollLeft)
  expect(before).toBeGreaterThan(0)
  await sendSystemEvent(page, {
    type: 'CANDIDATES',
    data: {
      inputContext: 'context',
      generation: 1,
      candidates: candidates(10),
      highlighted: -1,
      scrollState: SCROLLING,
      scrollStart: false,
      scrollEnd: true,
      hasClientPreedit: true,
      tabActions: [],
    },
  })
  expect(await list.evaluate(element => element.scrollLeft)).toBe(before)
})

test.describe('manual touch scrolling', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' })

  test.beforeEach(async ({ page }) => {
    await repeatRelativeScrollRequests(page)
  })

  for (const vertical of [false, true]) {
    test(`${vertical ? 'vertical' : 'horizontal'} dragging cancels native panning and scrolls one-to-one`, async ({ page }) => {
      await init(page)
      const list = page.locator('.fcitx-keyboard-candidates')
      await sendSystemEvent(page, {
        type: 'CANDIDATES',
        data: {
          inputContext: 'context',
          generation: 1,
          candidates: candidates(100),
          highlighted: -1,
          scrollState: SCROLLING,
          scrollStart: true,
          scrollEnd: true,
          hasClientPreedit: true,
          tabActions: [],
        },
      })
      if (vertical) {
        await tap(page.locator('.fcitx-keyboard-candidate-bar > .fcitx-keyboard-toolbar-button'))
      }
      const result = await list.evaluate(async (element, vertical) => {
        const touch = (clientX: number, clientY: number) => new Touch({
          identifier: 123,
          target: element,
          clientX,
          clientY,
        })
        const dispatch = (type: string, point: Touch) => {
          const event = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend'
              ? []
              : [point],
            changedTouches: [point],
          })
          element.dispatchEvent(event)
          return event.defaultPrevented
        }
        dispatch('touchstart', touch(150, 150))
        const prevented = [
          dispatch('touchmove', touch(140, 140)),
          dispatch('touchmove', touch(130, 130)),
        ]
        dispatch('touchend', touch(130, 130))
        await new Promise(requestAnimationFrame)
        await new Promise(requestAnimationFrame)
        return {
          prevented,
          touchAction: getComputedStyle(element).touchAction,
          distance: vertical ? element.scrollTop : element.scrollLeft,
          crossAxisDistance: vertical ? element.scrollLeft : element.scrollTop,
        }
      }, vertical)
      expect(result.prevented).toEqual([true, true])
      expect(result.touchAction).toBe('auto')
      expect(result.distance).toBe(20)
      expect(result.crossAxisDistance).toBe(0)
    })
  }
})

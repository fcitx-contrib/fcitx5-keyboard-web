import type { Page } from '@playwright/test'
import type { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { getBox, getKeyBackground, init, readScreenshotPixels, touchDown, touchUp } from './util'

async function expectSameOutline(page: Page, before: Buffer, after: Buffer) {
  const pixels = await readScreenshotPixels(page, [before, after])
  try {
    const maxDelta = await pixels.evaluate(([before, after]) => {
      let maxDelta = 0
      for (let i = 0; i < before.data.length; ++i) {
        maxDelta = Math.max(maxDelta, Math.abs(before.data[i] - after.data[i]))
      }
      return maxDelta
    })
    // A changing SVG contour may round antialiasing coverage by one color level.
    // Do not permit the much larger difference from displaced edges or shadows.
    expect(maxDelta).toBeLessThanOrEqual(1)
  }
  finally {
    await pixels.dispose()
  }
}

test('Show key preview while touching a normal key', async ({ page }) => {
  await init(page)

  const q = page.getByText('q1')
  const background = getKeyBackground(q)
  const originalPath = await background.locator('path').getAttribute('d')
  const originalBox = await getBox(background)
  const originalShadow = await background.evaluate(element => getComputedStyle(element).filter)
  await expect(q).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(q).toHaveCSS('box-shadow', 'none')
  await expect(background.locator('use')).toHaveCount(1)
  const touchId = await touchDown(q)
  const popover = page.locator('.fcitx-keyboard-popover-container')

  await expect(popover).toBeVisible()
  await expect(popover.locator('.fcitx-keyboard-popover')).toHaveText('q')
  await expect(background).toContainClass('fcitx-keyboard-popover-background')
  await expect(background.locator('path')).toHaveCount(1)
  await expect(background.locator('path')).not.toHaveAttribute('d', originalPath!)
  expect(await getBox(background)).toEqual(originalBox)
  expect(await background.evaluate(element => getComputedStyle(element).filter)).toEqual(originalShadow)
  expect(await background.evaluate(element => getComputedStyle(element).clipPath)).toEqual('none')
  await expect(popover).toHaveAttribute('data-position', 'left')

  await touchUp(q, touchId)
  await expect(popover).not.toBeVisible()
  await expect(q.locator('.fcitx-keyboard-sub-label')).toBeVisible()
  await expect(background.locator('path')).toHaveAttribute('d', originalPath!)
  await expect(background).not.toContainClass('fcitx-keyboard-popover-background')
})

test('Restore the previous silhouette when another key is touched', async ({ page }) => {
  await init(page)
  const q = page.getByText('q1')
  const w = page.getByText('w2')
  const qPath = getKeyBackground(q).locator('path')
  const originalPath = await qPath.getAttribute('d')
  const qTouch = await touchDown(q)
  await expect(qPath).not.toHaveAttribute('d', originalPath!)
  const wTouch = await touchDown(w)
  await expect(qPath).toHaveAttribute('d', originalPath!)
  await expect(getKeyBackground(w)).toContainClass('fcitx-keyboard-popover-background')
  await touchUp(w, wTouch)
  await touchUp(q, qTouch)
})

test('Resize the resting SVG and preserve it after a preview', async ({ page }) => {
  await init(page)
  const key = page.getByText('y6')
  const path = getKeyBackground(key).locator('path')
  const originalPath = await path.getAttribute('d')
  await page.setViewportSize({ width: 393, height: 800 })
  await expect(path).not.toHaveAttribute('d', originalPath!)
  const resizedPath = await path.getAttribute('d')
  const touchId = await touchDown(key)
  await touchUp(key, touchId, true)
  await expect(path).toHaveAttribute('d', resizedPath!)
})

test.describe('Key outline and bubble shadow', () => {
  test.use({
    viewport: { width: 393, height: 800 },
    deviceScaleFactor: 3,
  })

  for (const dark of [false, true]) {
    test(`Cast a soft shadow around the entire bubble in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
      await init(page)
      await page.clock.install({ time: 0 })
      await page.clock.pauseAt(1000)
      await page.locator('.fcitx-keyboard-container').evaluate((element, dark) => {
        element.classList.toggle('fcitx-dark', dark)
        element.classList.toggle('fcitx-light', !dark)
      }, dark)
      const key = page.getByText('g^')
      const background = getKeyBackground(key)
      const shadow = background.locator('use')
      const restingOffset = await shadow.getAttribute('y')
      const before = await key.locator('..').screenshot()
      await expect(shadow).toHaveCSS('filter', 'none')
      const touchId = await touchDown(key)
      await expect(shadow).toHaveAttribute('y', '0')
      const filterId = await background.locator('filter').getAttribute('id')
      await expect(shadow).toHaveAttribute('filter', `url(#${filterId})`)
      await expect(background.locator('feGaussianBlur')).toHaveAttribute('stdDeviation', '2')
      await expect(shadow).toHaveCSS('fill', dark ? 'rgba(16, 13, 14, 0.3)' : 'rgb(128, 128, 128)')

      const outline = await background.evaluate((svg) => {
        const box = svg.getBoundingClientRect()
        const path = svg.querySelector('path')!.getBBox()
        return {
          x: box.x + path.x,
          y: box.y + path.y,
          width: path.width,
          height: path.height,
        }
      })
      const clip = {
        x: Math.floor(outline.x) - 6,
        y: Math.floor(outline.y) - 6,
        width: Math.ceil(outline.width) + 13,
        height: Math.ceil(outline.height) + 13,
      }
      const withShadow = await page.screenshot({ clip })
      await shadow.evaluate(element => element.style.visibility = 'hidden')
      const withoutShadow = await page.screenshot({ clip })
      await shadow.evaluate(element => element.style.removeProperty('visibility'))
      const radius = await key.evaluate(element => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius))
      const images = await readScreenshotPixels(page, [withShadow, withoutShadow])
      try {
        const pixels = await images.evaluate((images, { outline, clip, radius }) => {
          const scale = images[0].width / clip.width
          const points = [
            { side: 'top', x: outline.x + outline.width / 2, y: outline.y - 1 },
            { side: 'left', x: outline.x - 1, y: outline.y + 2 * radius + 4 },
            { side: 'right', x: outline.x + outline.width + 1, y: outline.y + 2 * radius + 4 },
            { side: 'bottom', x: outline.x + outline.width / 2, y: outline.y + outline.height + 1 },
          ]
          return points.map(({ side, x, y }) => {
            const index = (Math.round((y - clip.y) * scale) * images[0].width + Math.round((x - clip.x) * scale)) * 4
            const brightness = images.map(({ data }) => data[index] + data[index + 1] + data[index + 2])
            return { side, withShadow: brightness[0], withoutShadow: brightness[1] }
          })
        }, { outline, clip, radius })
        for (const pixel of pixels) {
          expect(pixel.withShadow, `${pixel.side} shadow must not be clipped`).toBeLessThan(pixel.withoutShadow)
        }
      }
      finally {
        await images.dispose()
      }
      await touchUp(key, touchId)
      await expect(shadow).toHaveAttribute('y', restingOffset!)
      await expect(shadow).toHaveCSS('filter', 'none')
      expect(await key.locator('..').screenshot()).toEqual(before)
    })

    test(`Preserve the lower key outline in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
      await init(page)
      await page.locator('.fcitx-keyboard-container').evaluate((element, dark) => {
        element.classList.toggle('fcitx-dark', dark)
        element.classList.toggle('fcitx-light', !dark)
      }, dark)
      // Isolate the unchanged fill/outline from the deliberately different
      // bubble shadow and the disappearing key labels.
      await page.addStyleTag({ content: '.fcitx-keyboard-key { color: transparent !important; } .fcitx-keyboard-sub-label, .fcitx-keyboard-key-shadow { visibility: hidden !important; }' })

      for (const label of ['q1', 'y6', 'p0']) {
        const key = page.getByText(label)
        const box = await getBox(key)
        const x = Math.floor(box.x) - 2
        const y = Math.ceil(box.y + box.height * 0.75)
        const clip = {
          x,
          y,
          width: Math.ceil(box.width) + 4,
          height: Math.floor(box.y + box.height + 3) - y,
        }
        const before = await page.screenshot({ clip })
        const touchId = await touchDown(key)
        await expectSameOutline(page, before, await page.screenshot({ clip }))
        await touchUp(key, touchId, true)
        expect(await page.screenshot({ clip })).toEqual(before)
      }
    })
  }
})

import type { Page } from '@playwright/test'
import type { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { getBox, getKeyBackground, init, touchDown, touchUp } from './util'

async function expectSameOutline(page: Page, before: Buffer, after: Buffer) {
  const maxDelta = await page.evaluate(async (urls) => {
    const pixels = await Promise.all(urls.map(async (url) => {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      return context.getImageData(0, 0, image.width, image.height).data
    }))
    let maxDelta = 0
    for (let i = 0; i < pixels[0].length; ++i) {
      maxDelta = Math.max(maxDelta, Math.abs(pixels[0][i] - pixels[1][i]))
    }
    return maxDelta
  }, [before, after].map(buffer => `data:image/png;base64,${buffer.toString('base64')}`))
  // A changing SVG contour may round antialiasing coverage by one color level.
  // Do not permit the much larger difference from displaced edges or shadows.
  expect(maxDelta).toBeLessThanOrEqual(1)
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

test.describe('Key outline and shadow', () => {
  test.use({ viewport: { width: 393, height: 800 }, deviceScaleFactor: 3 })

  for (const dark of [false, true]) {
    test(`Preserve the lower key outline in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
      await init(page)
      await page.locator('.fcitx-keyboard-container').evaluate((element, dark) => {
        element.classList.toggle('fcitx-dark', dark)
        element.classList.toggle('fcitx-light', !dark)
      }, dark)
      // Compare only the key shape and shadow, excluding the disappearing labels.
      await page.addStyleTag({ content: '.fcitx-keyboard-key { color: transparent !important; } .fcitx-keyboard-sub-label { visibility: hidden !important; }' })

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

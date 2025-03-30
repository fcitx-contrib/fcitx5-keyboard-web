import { expect, test } from '@playwright/test'
import { DISABLED, ENABLED, getSentEvents, getToolbarButton, init, sendSystemEvent } from './util'

test('Undo', async ({ page }) => {
  await init(page)

  const undo = getToolbarButton(page, 1)
  const svg = undo.locator('svg')
  await expect(svg).toHaveCSS('color', ENABLED)

  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'UNDO',
  }])

  await sendSystemEvent(page, { type: 'UNDO', data: false })
  await expect(svg).toHaveCSS('color', DISABLED)
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'UNDO',
  }])

  await sendSystemEvent(page, { type: 'UNDO', data: true })
  await expect(svg).toHaveCSS('color', ENABLED)
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'UNDO',
  }, {
    type: 'UNDO',
  }])
})

test('Redo', async ({ page }) => {
  await init(page)

  const redo = getToolbarButton(page, 2)
  const svg = redo.locator('svg')
  await expect(svg).toHaveCSS('color', ENABLED)

  await redo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'REDO',
  }])

  await sendSystemEvent(page, { type: 'REDO', data: false })
  await expect(svg).toHaveCSS('color', DISABLED)
  await redo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'REDO',
  }])

  await sendSystemEvent(page, { type: 'REDO', data: true })
  await expect(svg).toHaveCSS('color', ENABLED)
  await redo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'REDO',
  }, {
    type: 'REDO',
  }])
})

test('Collapse', async ({ page }) => {
  await init(page)

  const collapse = getToolbarButton(page, 6)
  await collapse.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'COLLAPSE',
  }])
})

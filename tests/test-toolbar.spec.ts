import { expect, test } from '@playwright/test'
import { getSentEvents, getToolbarButton, init } from './util'

test('Undo', async ({ page }) => {
  await init(page)

  const undo = getToolbarButton(page, 1)
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'UNDO',
  }])
})

test('Redo', async ({ page }) => {
  await init(page)

  const undo = getToolbarButton(page, 2)
  await undo.tap()
  expect(await getSentEvents(page)).toEqual([{
    type: 'REDO',
  }])
})

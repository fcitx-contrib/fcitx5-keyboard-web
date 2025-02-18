import {
  expect,
  test,
} from '@playwright/test'
import { getSentEvents, init } from './util'

test('Click', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  await expect(q).toHaveCSS('background-color', 'rgb(255, 255, 255)')

  await q.dispatchEvent('touchstart')
  expect(await getSentEvents(page), 'To support other gestures, no event should be sent on press.').toEqual([])
  await expect(q).toHaveCSS('background-color', 'rgb(188, 192, 199)')

  await q.dispatchEvent('touchend')
  expect(await getSentEvents(page), '').toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'q', code: '' },
  }])
  await expect(q).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

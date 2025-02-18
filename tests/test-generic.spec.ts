import {
  expect,
  test,
} from '@playwright/test'
import { getSentEvents, init } from './util'

test('Click', async ({ page }) => {
  await init(page)

  const q = page.getByText('q')
  await q.dispatchEvent('touchstart')
  expect(await getSentEvents(page), 'To support other gestures, no event should be sent on press.').toEqual([])
  await q.dispatchEvent('touchend')
  expect(await getSentEvents(page), '').toEqual([{
    type: 'KEY_DOWN',
    data: { key: 'q', code: '' },
  }])
})

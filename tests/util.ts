import type {
  Locator,
  Page,
} from '@playwright/test'
import type { SystemEvent } from '../src/api'
import { dirname, join } from 'node:path'

export const WHITE = 'rgb(255, 255, 255)'
export const GRAY = 'rgb(188, 192, 199)'

export async function init(page: Page) {
  const url = `file://${join(dirname(import.meta.url), '..', 'dist', 'preview', 'index.html').substring('file:'.length)}`
  await page.goto(url)
}

export async function tap(locator: Locator) {
  await locator.dispatchEvent('touchstart')
  return locator.dispatchEvent('touchend')
}

export function getSentEvents(page: Page) {
  return page.evaluate(() => window.sentEvents)
}

export function sendSystemEvent(page: Page, event: SystemEvent) {
  return page.evaluate((event: SystemEvent) => {
    window.onMessage(JSON.stringify(event))
  }, event)
}

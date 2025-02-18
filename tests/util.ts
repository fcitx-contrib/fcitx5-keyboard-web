import type {
  Locator,
  Page,
} from '@playwright/test'
import { dirname, join } from 'node:path'

export async function init(page: Page) {
  const url = `file://${join(dirname(import.meta.url), '..', 'dist', 'preview', 'index.html').substring('file:'.length)}`
  await page.goto(url)
}

export function getSentEvents(page: Page) {
  return page.evaluate(() => window.sentEvents)
}

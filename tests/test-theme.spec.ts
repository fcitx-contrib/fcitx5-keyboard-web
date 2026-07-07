import { expect, test } from '@playwright/test'
import { getContainer, init } from './util'

test('Light and dark', async ({ page }) => {
  await init(page)

  const container = getContainer(page)
  await expect(container).toHaveCSS('background-color', 'rgb(227, 228, 230)')

  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(container).toHaveCSS('background-color', 'rgb(36, 36, 36)')
})

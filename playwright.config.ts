import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  projects: [{
    name: 'chromium',
    use: { isMobile: true, viewport: { width: 360, height: 240 }, hasTouch: true },
  }],
})

import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

/**
 * Playwright configuration for Video Pipeline E2E tests.
 *
 * This config lives inside e2e/ and can be invoked via:
 *   npx playwright test --config=e2e/playwright.config.ts
 *
 * Or used by the root playwright.config.ts which already points testDir to ./e2e.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: path.resolve(__dirname, '../playwright-report') }],
    ['list'],
  ],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Use storage state for auth if available
    storageState: process.env.STORAGE_STATE
      ? path.resolve(__dirname, process.env.STORAGE_STATE)
      : undefined,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

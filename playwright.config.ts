import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Loofi Loofi Flow/Veo Studio.
 *
 * Two modes:
 * 1. `npm run test:e2e`  — auto-starts Vite dev server
 * 2. `STAGING_URL=http://localhost:8080 npm run test:e2e` — tests against Docker staging
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const baseURL = process.env.STAGING_URL || 'http://localhost:8080';
const isStaging = Boolean(process.env.STAGING_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  timeout: 30_000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Auto-start Vite dev server unless testing against Docker staging
  ...(!isStaging && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  }),

  outputDir: 'test-results/e2e',
});

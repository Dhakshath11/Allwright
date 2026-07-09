import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './sample/tests',
  reporter: 'html',
  timeout: 30_000,
  fullyParallel: true,
  // Retry on CI only — local runs surface failures immediately.
  retries: process.env['CI'] ? 1 : 0,
  use: {
    baseURL: 'https://demo.playwright.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Per-browser filename convention: `web_<browser>.spec.ts`.
      // Without testMatch every project would run every spec —
      // mirrors the mobile `_ios.spec.ts` / `_android.spec.ts` pattern.
      testMatch: /_chromium\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /_firefox\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /_webkit\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

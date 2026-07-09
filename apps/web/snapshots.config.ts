import { defineConfig, devices } from '@playwright/test';

// Snapshots config — runs the locator-discovery specs at
// `./sample/snapshots/_snapshots_<browser>.spec.ts`. Each test writes
// one accessibility-tree JSON per page state to
// `./sample/resources/snapshots/<browser>_<state>.json`
// for the screen-builder skill to consume.
//
// Physically separated from the regression suite (`playwright.config.ts`
// has `testDir: './sample/tests'`, this one has `testDir: './sample/snapshots'`)
// — no spec is discoverable by both configs. Clean filesystem-level division
// of intent, mirroring the mobile snapshots.config.ts pattern.
//
// `fullyParallel: false` because snapshot specs share page state within the
// file (each test navigates from where the previous left off). Diagnostic
// tooling, not regression tests — side effects on the page, no assertions.
//
// Future: the clean separation is the substrate for AI-assisted self-healing
// — a runner can diff a freshly-captured snapshot against the one a POM was
// built from to detect locator drift.

export default defineConfig({
  testDir: './sample/snapshots',
  reporter: [['html', { open: 'never' }]],
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'https://demo.playwright.dev',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /_snapshots_chromium\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /_snapshots_firefox\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /_snapshots_webkit\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

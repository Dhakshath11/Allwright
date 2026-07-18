import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './sample/tests',
  reporter: [['html'], ['list']],
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  use: {
    baseURL: process.env['API_BASE_URL'] ?? 'https://jsonplaceholder.typicode.com',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  projects: [
    {
      name: 'api',
      testMatch: /_api\.spec\.ts$/,
    },
  ],
});

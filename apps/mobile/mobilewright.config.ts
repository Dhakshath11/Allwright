import { defineConfig } from 'mobilewright';

export default defineConfig({
  testDir: './sample/tests',
  reporter: 'html',
  timeout: 90_000,
  globalSetup: './global-setup.ts',
  workers: 2,
  fullyParallel: true,
  projects: [
    {
      name: 'ios',
      // Per-platform filename convention: `mobile_<platform>.spec.ts`.
      // Without testMatch every project would run every spec — the
      // android project would try to drive iOS specs and vice versa.
      testMatch: /_ios\.spec\.ts$/,
      use: {
        platform: 'ios',
        bundleId: 'com.apple.MobileAddressBook',
        deviceName: /iPhone 17 Pro/,
        // installApps: 'ios/MyApp.zip',
      },
    },
    {
      name: 'android',
      testMatch: /_android\.spec\.ts$/,
      use: {
        platform: 'android',
        bundleId: 'com.google.android.contacts',
        deviceName: /Pixel 10 Pro/,
        // installApps: 'android/MyApp.apk',
      },
    },
  ],
});

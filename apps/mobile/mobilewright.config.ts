import { defineConfig } from 'mobilewright';

export default defineConfig({
  reporter: 'html',
  timeout: 90_000,
  globalSetup: './global-setup.ts',
  workers: 2,
  fullyParallel: true,
  projects: [
    {
      name: 'ios',
      // Only specs whose filename ends with `_ios.spec.ts` run on this
      // project (covers `mobile_ios.spec.ts` and `_dump_ios.spec.ts`).
      // Without this filter, every project runs every spec, doubling
      // the test count and trying to drive Android tests on iOS.
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
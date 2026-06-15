import { defineConfig } from 'mobilewright';

// Snapshots config — runs the locator-discovery specs at
// `./sample/snapshots/_snapshots_<platform>.spec.ts`. Each test writes
// one JSON view-tree to `./sample/resources/snapshots/<platform>_<state>.json`
// for the `screen-builder` skill to consume.
//
// Physically separated from the regression suite (the main
// `mobilewright.config.ts` has `testDir: './sample/tests'`, this one
// has `testDir: './sample/snapshots'`) — no spec is discoverable by
// both. Clean filesystem-level division of intent.
//
// `fullyParallel: false` because snapshot specs share device state
// within the file (each test navigates from where the previous left
// off, e.g. add → detail → edit). Diagnostic tooling, not regression
// tests; side effects on the device, no assertions.
//
// Future: this clean separation is the substrate for AI-assisted
// self-healing — a runner can diff a freshly-captured snapshot against
// the one a POM was built from to detect locator drift.

export default defineConfig({
  testDir: './sample/snapshots',
  reporter: 'html',
  timeout: 90_000,
  workers: 2,
  fullyParallel: false,
  projects: [
    {
      name: 'ios',
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
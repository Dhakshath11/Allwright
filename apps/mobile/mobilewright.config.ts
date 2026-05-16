import { defineConfig } from 'mobilewright';

export default defineConfig({

  platform: 'ios',
  bundleId: 'com.apple.MobileAddressBook',
  deviceName: /iPhone 17 Pro/,
  testDir: './sample',
  reporter: 'html',
  timeout: 90_000,
});
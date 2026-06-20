// Device-level smoke tests — exercise every public method on
// `device` and assert its return shape. These are framework-level
// checks (no POM), separate from the Contacts UI flows so a regression
// in mobilewright's Device wrapper is caught with a clear failure.

import { test, expect } from '@mobilewright/test';
import type { TestInfo } from 'playwright/test';
import type {
  AppInfo,
  Orientation,
  RecordingResult,
  ScreenSize,
} from '@mobilewright/protocol';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS = 'com.apple.Preferences';
const SAFARI = 'com.apple.mobilesafari';
const SPRINGBOARD = 'com.apple.springboard';
const CONTACTS = 'com.apple.MobileAddressBook';

// Surface a return value in the HTML report so users learn what each
// Device method hands back without reading the protocol types. Shows up
// under the test's Attachments panel.
const attachJson = async (
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> => {
  await testInfo.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
};

test.describe('iOS Device API', () => {
  // Each test may change the foreground app or orientation. Restore the
  // project's app at end-of-test so later specs in the iOS project don't
  // inherit weird state.
  test.afterEach(async ({ device }) => {
    await device.setOrientation('portrait').catch(() => {});
    await device.launchApp(CONTACTS).catch(() => {});
  });

  test('device.screen and device.driver are exposed (sync)', ({ device }) => {
    expect(device.driver).toBeDefined();
    expect(device.screen).toBeDefined();
    // screen getter is memoized — same ref across reads.
    expect(device.screen).toBe(device.screen);
  });

  test('screenSize returns points on iOS (portrait, sane scale)', async ({ device }, testInfo) => {
    const size: ScreenSize = await device.screenSize();
    await attachJson(testInfo, 'device.screenSize() → ScreenSize', size);

    expect(typeof size.width).toBe('number');
    expect(typeof size.height).toBe('number');
    expect(typeof size.scale).toBe('number');
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(size.width); // portrait
    // iPhone reports POINTS (~393 wide), not pixels (~1206). Guards the
    // common mistake of computing coords as if iOS returned pixels.
    expect(size.width).toBeLessThan(600);
    expect(size.scale).toBeGreaterThanOrEqual(1);
    expect(size.scale).toBeLessThanOrEqual(3);
  });

  test('getOrientation / setOrientation round-trip', async ({ device }, testInfo) => {
    // Set against Safari — Contacts is portrait-locked on iPhone so
    // setOrientation('landscape') would be reverted by the app.
    await device.launchApp(SAFARI);

    const before: Orientation = await device.getOrientation();
    expect(['portrait', 'landscape']).toContain(before);

    const target: Orientation = before === 'portrait' ? 'landscape' : 'portrait';
    await device.setOrientation(target);
    const after = await device.getOrientation();
    expect(after).toBe(target);

    await attachJson(testInfo, 'device.getOrientation() → Orientation', { before, target, after });

    await device.setOrientation(before);
    expect(await device.getOrientation()).toBe(before);
  });

  test('launchApp blocks until foreground; getForegroundApp returns AppInfo', async ({ device }, testInfo) => {
    await device.launchApp(SETTINGS);

    const fg: AppInfo = await device.getForegroundApp();
    await attachJson(testInfo, 'device.getForegroundApp() → AppInfo', fg);

    expect(fg.bundleId).toBe(SETTINGS);
  });

  test('terminateApp drops the foreground back to Springboard', async ({ device }, testInfo) => {
    await device.launchApp(SETTINGS);
    const before = await device.getForegroundApp();
    expect(before.bundleId).toBe(SETTINGS);

    await device.terminateApp(SETTINGS);
    const after = await device.getForegroundApp();
    expect(after.bundleId).toBe(SPRINGBOARD);

    await attachJson(testInfo, 'foreground before vs after terminate', { before, after });
  });

  test('launchApp with noWaitAfter returns immediately (no foreground poll)', async ({ device }) => {
    await device.terminateApp(SETTINGS).catch(() => {});
    // Without noWaitAfter this blocks up to appLaunchTimeout polling for
    // foreground. With it, control returns as soon as the RPC is sent.
    await device.launchApp(SETTINGS, { noWaitAfter: true });
  });

  test('listApps returns an array containing well-known system apps', async ({ device }, testInfo) => {
    const apps: AppInfo[] = await device.listApps();
    // Attach count + first 5 entries — full list can be 100+ on simulator.
    await attachJson(testInfo, 'device.listApps() → AppInfo[] (count + sample)', {
      count: apps.length,
      sample: apps.slice(0, 5),
    });

    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBeGreaterThan(0);
    // Bundle IDs are stable across locales / iOS versions; names are not.
    const bundleIds = apps.map((a) => a.bundleId);
    expect(bundleIds).toContain(SETTINGS);
    expect(bundleIds).toContain(SAFARI);
    expect(bundleIds).toContain(CONTACTS);
  });

  test('openUrl (https://) opens Safari as the foreground app', async ({ device }, testInfo) => {
    await device.openUrl('https://example.com');

    const fg = await device.getForegroundApp();
    await attachJson(testInfo, 'foreground after openUrl', fg);

    expect(fg.bundleId).toBe(SAFARI);
  });

  test('goto is an alias of openUrl', async ({ device }, testInfo) => {
    await device.goto('https://example.com');
    const fg = await device.getForegroundApp();
    await attachJson(testInfo, 'foreground after goto', fg);

    expect(fg.bundleId).toBe(SAFARI);
  });

  test('startRecording / stopRecording writes an mp4 with output path', async ({ device }, testInfo) => {
    const outDir = path.join(testInfo.project.outputDir, 'recordings');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `device-api-${Date.now()}.mp4`);

    await device.startRecording({ output: out, timeLimit: 30 });
    // Capture ~1.5s of activity. Use sleep to simulate "work happening".
    await new Promise((r) => setTimeout(r, 1500));
    const result: RecordingResult = await device.stopRecording();
    await attachJson(testInfo, 'device.stopRecording() → RecordingResult', result);

    expect(result.output).toBe(out);
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.statSync(out).size).toBeGreaterThan(0);
  });

  // installApp requires a `.zip` of the .app bundle for iOS simulator (or
  // a `.ipa` for real device). No fixture binary is committed — unfixme
  // and point IPA_PATH at a real build to run.
  test.fixme('installApp accepts iOS-sim .zip (or real-device .ipa)', async ({ device }) => {
    const IPA_PATH = '/tmp/MyApp.zip';
    await device.installApp(IPA_PATH);
    await device.uninstallApp('com.example.myapp');
  });

});

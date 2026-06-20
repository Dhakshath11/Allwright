// Device-level smoke tests — Android mirror of mobile_device_ios.spec.ts.
// Exercises every public method on `device` and asserts its return shape.
// Uses Android bundle IDs and accounts for Android platform behaviour.

import { test, expect } from '@mobilewright/test';
import type { TestInfo } from 'playwright/test';
import { sleep } from '@mobilewright/core';
import type {
  AppInfo,
  Orientation,
  RecordingResult,
  ScreenSize,
} from '@mobilewright/protocol';
import * as fs from 'fs';
import * as path from 'path';

const SETTINGS = 'com.android.settings';
const CHROME   = 'com.android.chrome';
const CONTACTS = 'com.google.android.contacts';

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

test.describe('Android Device API', () => {
  test.afterEach(async ({ device }) => {
    await device.setOrientation('portrait').catch(() => {});
    await device.launchApp(CONTACTS).catch(() => {});
  });

  test('device.screen and device.driver are exposed (sync)', ({ device }) => {
    expect(device.driver).toBeDefined();
    expect(device.screen).toBeDefined();
    expect(device.screen).toBe(device.screen);
  });

  test('screenSize returns dimensions with scale (portrait)', async ({ device }, testInfo) => {
    const size: ScreenSize = await device.screenSize();
    await attachJson(testInfo, 'device.screenSize() → ScreenSize', size);

    expect(typeof size.width).toBe('number');
    expect(typeof size.height).toBe('number');
    expect(typeof size.scale).toBe('number');
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(size.width); // portrait
    expect(size.scale).toBeGreaterThanOrEqual(1);
    // No upper-bound on width — Android may return dp or physical pixels
    // depending on driver version; don't assume a point-sized value like iOS.
  });

  test('getOrientation / setOrientation round-trip', async ({ device }, testInfo) => {
    // Use Chrome — Contacts may be portrait-locked on Android too.
    await device.launchApp(CHROME);

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

  test('terminateApp removes app from foreground', async ({ device }, testInfo) => {
    await device.launchApp(SETTINGS);
    const before = await device.getForegroundApp();
    expect(before.bundleId).toBe(SETTINGS);

    await device.terminateApp(SETTINGS);
    const after = await device.getForegroundApp();
    // Android returns to the home launcher — exact package varies by image,
    // so assert the terminated app is gone rather than pinning a launcher ID.
    expect(after.bundleId).not.toBe(SETTINGS);

    await attachJson(testInfo, 'foreground before vs after terminate', { before, after });
  });

  test('launchApp with noWaitAfter returns immediately (no foreground poll)', async ({ device }) => {
    await device.terminateApp(SETTINGS).catch(() => {});
    await device.launchApp(SETTINGS, { noWaitAfter: true });
  });

  test('listApps returns array containing well-known apps', async ({ device }, testInfo) => {
    const apps: AppInfo[] = await device.listApps();
    await attachJson(testInfo, 'device.listApps() → AppInfo[] (count + sample)', {
      count: apps.length,
      sample: apps.slice(0, 5),
    });

    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBeGreaterThan(0);
    const bundleIds = apps.map((a) => a.bundleId);
    expect(bundleIds).toContain(SETTINGS);
    expect(bundleIds).toContain(CONTACTS);
  });

  test('openUrl (https://) opens Chrome as foreground app', async ({ device }, testInfo) => {
    await device.openUrl('https://example.com');

    await sleep(600);
    const fg = await device.getForegroundApp();
    await attachJson(testInfo, 'foreground after openUrl', fg);

    expect(fg.bundleId).toBe(CHROME);
  });

  test('goto is an alias of openUrl', async ({ device }, testInfo) => {
    await device.goto('https://example.com');
    await sleep(600);
    const fg = await device.getForegroundApp();
    await attachJson(testInfo, 'foreground after goto', fg);

    expect(fg.bundleId).toBe(CHROME);
  });

  test('startRecording / stopRecording writes an mp4 with output path', async ({ device }, testInfo) => {
    const outDir = path.join(testInfo.project.outputDir, 'recordings');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `device-api-android-${Date.now()}.mp4`);

    await device.startRecording({ output: out, timeLimit: 30 });
    await new Promise((r) => setTimeout(r, 1500));
    const result: RecordingResult = await device.stopRecording();
    await attachJson(testInfo, 'device.stopRecording() → RecordingResult', result);

    expect(result.output).toBe(out);
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.statSync(out).size).toBeGreaterThan(0);
  });

  // installApp requires a signed .apk. No fixture binary is committed —
  // unfixme and point APK_PATH at a real build to run.
  test.fixme('installApp accepts an .apk', async ({ device }) => {
    const APK_PATH = '/tmp/MyApp.apk';
    await device.installApp(APK_PATH);
    await device.uninstallApp('com.example.myapp');
  });
});

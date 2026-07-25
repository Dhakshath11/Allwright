// Playground WebView smoke test — exercises the mobilewright WebView API.
// Workflow: native dashboard → tap Web View → attach to embedded WKWebView
// (Playwright Page) → fill Name field → submit → assert native success screen
// → tap iOS native Back button → confirm back on dashboard.
//
// Page HTML confirmed: form has <label for="name">Name</label> and a submit
// button. Submit navigates to playground://login-successful?name=... (native
// deep link) — the WKWebView is replaced by a native success screen, so all
// post-submit assertions use utils (native), not page (web).

import { test, expect } from '@mobilewright/test';
import { sleep } from '@mobilewright/core';
import type { AppInfo, RecordingResult } from '@mobilewright/protocol';
import type { Page } from 'playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { MobileUtils } from '../../utils/mobile.utils';
import { PlaygroundMainScreen } from '../screens/ios/playground-main.screen';
import { PlaygroundPreferencesScreen } from '../screens/ios/playground-preferences.screen';
import { PlaygroundContinuousAnimationScreen } from '../screens/ios/playground-continuous-animation.screen';
import { PlaygroundPermissionsScreen } from '../screens/ios/playground-permissions.screen';
import { PlaygroundPermissionsAlertScreen } from '../screens/ios/playground-permissions-alert.screen';

const PLAYGROUND = 'com.mobilenext.playground';
const APP_PATH = path.join(__dirname, '../resources/app/Playground-1.0.4.zip');

test.describe('iOS Playground — WebView', () => {
  test.beforeAll(async ({ device }) => {
    const apps: AppInfo[] = await device.listApps();
    if (!apps.some((a) => a.bundleId === PLAYGROUND)) {
      await device.installApp(APP_PATH);
    }
  });

  test.afterEach(async ({ device }) => {
    // Terminate (not just relaunch) so the app starts fresh next time —
    // without this, the app restores its last screen instead of the dashboard.
    await device.terminateApp(PLAYGROUND).catch(() => {});
  });

  test('fills WebView Name field, submits, verifies native success screen, returns to dashboard', async ({ device, screen }, testInfo) => {
    const utils = new MobileUtils(screen);

    await test.step('Launch playground', async () => {
      await device.launchApp(PLAYGROUND);
    });

    // ── Native context ────────────────────────────────────────────────────
    await test.step('Tap Web View on dashboard', async () => {
      await utils.tap(utils.getByText('Web View'));
    });

    // ── Web context ───────────────────────────────────────────────────────
    // getByWebView() attaches to the embedded WKWebView and returns a
    // Playwright Page. Locators, actions, and assertions use Playwright's API.
    let page!: Page;
    await test.step('Attach to WebView', async () => {
      page = await utils.getByWebView().page();
    });

    await test.step('Fill Name and submit', async () => {
      // Label is "Name" (<label for="name">Name</label>) — getByLabel is stable.
      await page.getByLabel('Name').fill('Valar Morghulis');
      await page.getByRole('button', { name: 'Submit' }).click();
    });

    // ── Native success screen ─────────────────────────────────────────────
    // Submit fires playground://login-successful?name=... — a native deep
    // link that replaces the WKWebView with a native screen. Use utils here.
    await test.step('Assert native success screen shows submitted name', async () => {
      await expect(utils.getByText('Login Successful')).toBeVisible();
      await expect(utils.getByTestId('login_success_message')).toContainText('Valar Morghulis');
    });

    await test.step('Attach success screenshot', async () => {
      const screenshot = await screen.screenshot();
      await testInfo.attach('success-screen', {
        body: screenshot,
        contentType: 'image/png',
      });
    });

    // ── Back to native dashboard ──────────────────────────────────────────
    // iOS navigation-bar back chevron is native — utils, not page.
    await test.step('Tap Back and confirm dashboard', async () => {
      await utils.tap(utils.getByRole('button', 'Back'));
      await expect(utils.getByText('Web View')).toBeVisible();
    });
  });
});

test.describe('iOS Playground — Main, Preferences, and Continuous Animation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ device }) => {
    const apps: AppInfo[] = await device.listApps();
    if (!apps.some((a) => a.bundleId === PLAYGROUND)) {
      await device.installApp(APP_PATH);
    }
  });

  test.afterEach(async ({ device }) => {
    await device.terminateApp(PLAYGROUND).catch(() => {});
  });

  test('shows all 5 menu items on launch', async ({ device, screen }) => {
    await test.step('Launch playground', async () => {
      await device.terminateApp(PLAYGROUND).catch(() => {});
      await device.launchApp(PLAYGROUND);
    });

    const mainScreen = new PlaygroundMainScreen(screen);
    await mainScreen.expectAllMenuItemsVisible();
  });

  test('SharedPref/Keychain — enter credentials, toggle visibility, save, screenshot, return to Main', async ({ device, screen }, testInfo) => {
    await test.step('Launch playground', async () => {
      await device.terminateApp(PLAYGROUND).catch(() => {});
      await device.launchApp(PLAYGROUND);
    });

    const mainScreen = new PlaygroundMainScreen(screen);
    const prefsScreen = new PlaygroundPreferencesScreen(screen);

    await mainScreen.tapSharedPrefKeychain();
    await prefsScreen.expectPreferencesScreen();
    await prefsScreen.enterUsername({ username: 'Robert' });
    await prefsScreen.enterPassword({ password: 'uX678**+oPMqa' });
    await prefsScreen.tapRevealPassword();
    await prefsScreen.expectPasswordRevealed({ password: 'uX678**+oPMqa' });

    await test.step('Take and save preferences screenshot', async () => {
      const screenshotBytes = await screen.screenshot();
      const screenshotDir = path.join(__dirname, '../resources/screenshots');
      fs.mkdirSync(screenshotDir, { recursive: true });
      fs.writeFileSync(path.join(screenshotDir, 'Preferences_Image.png'), screenshotBytes);
      await testInfo.attach('preferences-screenshot', {
        body: screenshotBytes,
        contentType: 'image/png',
      });
    });

    await prefsScreen.tapSave();
    await prefsScreen.expectStatusSaved();
    await prefsScreen.tapBack();
    await mainScreen.expectAllMenuItemsVisible();
  });

  test('Continuous Animation — video recording + notification bar open/close', async ({ device, screen }, testInfo) => {
    await test.step('Launch playground', async () => {
      await device.terminateApp(PLAYGROUND).catch(() => {});
      await device.launchApp(PLAYGROUND);
    });

    const mainScreen = new PlaygroundMainScreen(screen);
    const animationScreen = new PlaygroundContinuousAnimationScreen(screen);
    const utils = new MobileUtils(screen);

    const recordingDir = path.join(testInfo.project.outputDir, 'recordings');
    fs.mkdirSync(recordingDir, { recursive: true });
    const recordingPath = path.join(recordingDir, `continuous-animation-${Date.now()}.mp4`);

    await test.step('Start video recording', async () => {
      await device.startRecording({ output: recordingPath, timeLimit: 30 });
    });

    await mainScreen.tapContinuousAnimation();
    await animationScreen.expectAnimationScreenLoaded();
    await sleep(5000);
    await animationScreen.tapBack();

    await test.step('Stop video recording and attach', async () => {
      const result: RecordingResult = await device.stopRecording();
      const videoPath = result.output ?? recordingPath;
      await testInfo.attach('continuous-animation-recording', {
        body: fs.readFileSync(videoPath),
        contentType: 'video/mp4',
      });
    });

    await test.step('Open notification bar', async () => {
      const screenSize = await device.screenSize();
      await utils.openNotifications(screenSize);
      await sleep(800);
    });

    await test.step('Close notification bar', async () => {
      const screenSize = await device.screenSize();
      await utils.closeNotifications(screenSize);
      await sleep(400);
    });
  });
});

test.describe('iOS Playground — Permissions And Alerts', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ device, screen }) => {
    // Dismiss any leftover system alert from a previous run (e.g. a lingering
    // camera permission dialog that survived app termination).
    // iOS system alerts persist across app termination — tapping Don't Allow is
    // the only reliable way to clear them. Silently skip if no alert is present.
    const utils = new MobileUtils(screen);
    await utils.tap(utils.getByRole('button', 'Don\'t Allow')).catch(() => {});
    await sleep(500);
    // Uninstall + reinstall to guarantee "Not Determined" permission state.
    // terminateApp alone is not enough — iOS caches permission state across launches.
    await device.uninstallApp(PLAYGROUND).catch(() => {});
    await device.installApp(APP_PATH);
    // Allow the OS time to register the freshly installed app before the first launchApp.
    await sleep(3000);
  });

  test.afterEach(async ({ device }) => {
    await device.terminateApp(PLAYGROUND).catch(() => {});
  });

  test('camera permission: Not Determined → request → Allow → Granted', async ({ device, screen }, testInfo) => {
    const mainScreen = new PlaygroundMainScreen(screen);
    const permissionsScreen = new PlaygroundPermissionsScreen(screen);
    const alertScreen = new PlaygroundPermissionsAlertScreen(screen);

    await test.step('Launch playground', async () => {
      await device.terminateApp(PLAYGROUND).catch(() => {});
      // noWaitAfter skips the foreground poll — fresh installs take longer to
      // reach the main screen than the mobilewright default allows. The subsequent
      // tap relies on actionTimeout (20 s) to poll until the element appears.
      await device.launchApp(PLAYGROUND, { noWaitAfter: true });
    });

    await mainScreen.tapPermissionsAndAlerts();
    await permissionsScreen.expectAtScreen();
    await permissionsScreen.expectStatusNotDetermined();

    await permissionsScreen.tapRequestCameraPermission();
    await alertScreen.expectAlertVisible();

    await test.step('Screenshot permission popup', async () => {
      const screenshot = await screen.screenshot();
      await testInfo.attach('camera-permission-popup', {
        body: screenshot,
        contentType: 'image/png',
      });
    });

    await alertScreen.tapAllow();
    await permissionsScreen.expectAtScreen();
    await permissionsScreen.expectStatusGranted();
  });
});

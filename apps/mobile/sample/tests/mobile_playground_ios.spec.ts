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
import type { AppInfo } from '@mobilewright/protocol';
import type { Page } from 'playwright/test';
import * as path from 'path';
import { MobileUtils } from '../../utils/mobile.utils';

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

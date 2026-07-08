import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class PlaygroundMainScreen {
  private readonly utils: MobileUtils;
  private readonly basicUiButton: Locator;
  private readonly webViewButton: Locator;
  private readonly sharedPrefKeychainButton: Locator;
  private readonly continuousAnimationButton: Locator;
  private readonly permissionsAndAlertsButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);
    this.basicUiButton = this.utils.getByTestId('Basic UI');
    this.webViewButton = this.utils.getByTestId('Web View');
    this.sharedPrefKeychainButton = this.utils.getByTestId('SharedPref / Keychain');
    this.continuousAnimationButton = this.utils.getByTestId('Continuous Animation');
    this.permissionsAndAlertsButton = this.utils.getByTestId('Permissions and Alerts');
  }

  async tapBasicUi(): Promise<void> {
    await test.step('Tap Basic UI button', async () => {
      await this.utils.tap(this.basicUiButton);
    });
  }

  async tapWebView(): Promise<void> {
    await test.step('Tap Web View button', async () => {
      await this.utils.tap(this.webViewButton);
    });
  }

  async tapSharedPrefKeychain(): Promise<void> {
    await test.step('Tap SharedPref / Keychain button', async () => {
      await this.utils.tap(this.sharedPrefKeychainButton);
    });
  }

  async tapContinuousAnimation(): Promise<void> {
    await test.step('Tap Continuous Animation button', async () => {
      await this.utils.tap(this.continuousAnimationButton);
    });
  }

  async tapPermissionsAndAlerts(): Promise<void> {
    await test.step('Tap Permissions and Alerts button', async () => {
      await this.utils.tap(this.permissionsAndAlertsButton);
    });
  }

  async expectAllMenuItemsVisible(): Promise<void> {
    await test.step('Expect all 5 menu items are visible on main screen', async () => {
      await expect(this.basicUiButton).toBeVisible();
      await expect(this.webViewButton).toBeVisible();
      await expect(this.sharedPrefKeychainButton).toBeVisible();
      await expect(this.continuousAnimationButton).toBeVisible();
      await expect(this.permissionsAndAlertsButton).toBeVisible();
    });
  }
}

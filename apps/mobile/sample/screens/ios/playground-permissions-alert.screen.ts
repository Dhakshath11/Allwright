import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class PlaygroundPermissionsAlertScreen {
  private readonly utils: MobileUtils;
  private readonly alertTitle: Locator;
  private readonly allowButton: Locator;
  private readonly dontAllowButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);
    // iOS system alert labels use typographic (curly) quotes — NOT ASCII straight quotes.
    // Verified from ios_playground_permissions_popup.json:
    //   alertTitle  → U+201C/U+201D: “Playground” ...
    //   dontAllow   → U+2019 apostrophe: Don’t Allow
    this.alertTitle = this.utils.getByText('“Playground” would like to access the Camera.');
    this.allowButton = this.utils.getByRole('button', 'Allow');
    this.dontAllowButton = this.utils.getByRole('button', 'Don’t Allow');
  }

  async expectAlertVisible(): Promise<void> {
    await test.step('Expect camera permission system alert is visible', async () => {
      // iOS system alerts animate in after the app triggers the permission request.
      // Use a generous timeout to allow the OS to present the alert.
      await expect(this.alertTitle).toBeVisible({ timeout: 10000 });
    });
  }

  async tapAllow(): Promise<void> {
    await test.step('Tap Allow on camera permission alert', async () => {
      await this.utils.tap(this.allowButton);
    });
  }

  async tapDontAllow(): Promise<void> {
    await test.step("Tap Don't Allow on camera permission alert", async () => {
      await this.utils.tap(this.dontAllowButton);
    });
  }
}

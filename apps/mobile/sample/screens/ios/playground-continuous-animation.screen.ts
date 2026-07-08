import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class PlaygroundContinuousAnimationScreen {
  private readonly utils: MobileUtils;
  private readonly screenTitle: Locator;
  private readonly backButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);
    this.screenTitle = this.utils.getByText('Continuous Animation');
    this.backButton = this.utils.getByTestId('BackButton');
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back button', async () => {
      await this.utils.tap(this.backButton);
    });
  }

  async expectAnimationScreenLoaded(): Promise<void> {
    await test.step('Expect Continuous Animation screen is loaded', async () => {
      await expect(this.screenTitle).toBeVisible();
    });
  }
}

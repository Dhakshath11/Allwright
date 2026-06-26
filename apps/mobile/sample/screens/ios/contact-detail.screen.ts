import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class ContactDetailScreen {
  private readonly utils: MobileUtils;

  private readonly back: Locator;
  private readonly editButton: Locator;
  private readonly mobileLabel: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.back = this.utils.getByTestId('BackButton');
    this.editButton = this.utils.getByText('Edit');
    this.mobileLabel = this.utils.getByText('mobile');
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back', async () => {
      await this.utils.tap(this.back);
    });
  }

  async tapEdit(): Promise<void> {
    await test.step('Tap Edit', async () => {
      await this.utils.tap(this.editButton);
    });
  }

  async expectAtDetailScreen({ name }: { name: string }): Promise<void> {
    await test.step(`Expect at "${name}" detail screen`, async () => {
      await expect(this.utils.getByText(name)).toBeVisible();
      await expect(this.editButton).toBeVisible();
    });
  }

  async expectMobileNumber({ displayedNumber }: { displayedNumber: string }): Promise<void> {
    await test.step(`Expect mobile number "${displayedNumber}"`, async () => {
      await expect(this.mobileLabel).toBeVisible();
      await expect(this.utils.getByText(displayedNumber)).toBeVisible();
    });
  }
}

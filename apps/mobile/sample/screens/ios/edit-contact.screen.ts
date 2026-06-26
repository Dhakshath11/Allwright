import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class EditContactScreen {
  private readonly utils: MobileUtils;

  private readonly closeButton: Locator;
  private readonly doneButton: Locator;
  private readonly addPhoneButton: Locator;
  private readonly mobileField: Locator;
  private readonly deleteContactButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.closeButton = this.utils.getByTestId('close');
    this.doneButton = this.utils.getByTestId('Done');
    this.addPhoneButton = this.utils.getByTestId('Insert add phone');
    this.mobileField = this.utils.getByPlaceholder('Phone').first();
    this.deleteContactButton = this.utils.getByText('Delete Contact');
  }

  async tapAddPhone(): Promise<void> {
    await test.step('Tap Add Phone', async () => {
      await this.utils.tap(this.addPhoneButton);
    });
  }

  async fillMobile({ value }: { value: string }): Promise<void> {
    await test.step(`Fill mobile number "${value}"`, async () => {
      await this.utils.fill(this.mobileField, value);
    });
  }

  async save(): Promise<void> {
    await test.step('Save edited contact', async () => {
      await this.utils.tap(this.doneButton);
    });
  }

  async cancel(): Promise<void> {
    await test.step('Cancel edit', async () => {
      await this.utils.tap(this.closeButton);
    });
  }

  async expectAtEditScreen(): Promise<void> {
    await test.step('Expect at Edit Contact screen', async () => {
      await expect(this.doneButton).toBeVisible();
    });
  }

  // `minSwipes: 5` forces unconditional swipes — the StaticText for
  // "Delete Contact" is reported as visible with placeholder bounds
  // (0, 0) while off-screen, so a pure visibility-driven loop exits
  // immediately. See `MobileUtils.swipeUntilVisible` docs.
  async scrollToDeleteContact(): Promise<void> {
    await test.step('Scroll to Delete Contact', async () => {
      await this.utils.swipeUntilVisible(this.deleteContactButton, {
        minSwipes: 2,
        maxSwipes: 5,
      });
    });
  }

  async tapDeleteContact(): Promise<void> {
    await test.step('Tap Delete Contact', async () => {
      await this.utils.tap(this.deleteContactButton);
    });
  }

  // After tapDeleteContact, an action sheet appears with a second
  // "Delete Contact" button. Target the last match — the sheet renders
  // after the form button in the view tree.
  async confirmDeleteContact(): Promise<void> {
    await test.step('Confirm Delete Contact', async () => {
      await this.utils.tap(this.utils.getByText('Delete Contact').last());
    });
  }
}

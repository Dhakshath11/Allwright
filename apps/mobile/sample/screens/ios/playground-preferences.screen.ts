import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class PlaygroundPreferencesScreen {
  private readonly utils: MobileUtils;
  private readonly screenTitle: Locator;
  private readonly usernameField: Locator;
  private readonly passwordField: Locator;
  private readonly revealButton: Locator;
  private readonly saveButton: Locator;
  private readonly backButton: Locator;
  private readonly statusMessage: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);
    this.screenTitle = this.utils.getByText('Preferences');
    this.usernameField = this.utils.getByTestId('username_field');
    this.passwordField = this.utils.getByTestId('password_field');
    this.revealButton = this.utils.getByTestId('reveal_button');
    this.saveButton = this.utils.getByTestId('save_button');
    this.backButton = this.utils.getByTestId('BackButton');
    this.statusMessage = this.utils.getByTestId('status_message');
  }

  async enterUsername({ username }: { username: string }): Promise<void> {
    await test.step(`Enter username "${username}"`, async () => {
      await this.utils.fill(this.usernameField, username);
    });
  }

  async enterPassword({ password }: { password: string }): Promise<void> {
    await test.step('Enter password', async () => {
      await this.utils.fill(this.passwordField, password);
    });
  }

  async tapRevealPassword(): Promise<void> {
    await test.step('Tap reveal button to toggle password visibility', async () => {
      await this.utils.tap(this.revealButton);
    });
  }

  async tapSave(): Promise<void> {
    await test.step('Tap Save button', async () => {
      await this.utils.tap(this.saveButton);
    });
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back button', async () => {
      await this.utils.tap(this.backButton);
    });
  }

  async expectPreferencesScreen(): Promise<void> {
    await test.step('Expect Preferences screen is visible', async () => {
      await expect(this.screenTitle).toBeVisible();
    });
  }

  async expectStatusSaved(): Promise<void> {
    await test.step('Expect STATUS SAVED confirmation is visible', async () => {
      await expect(this.statusMessage).toBeVisible();
    });
  }

  async expectPasswordRevealed({ password }: { password: string }): Promise<void> {
    await test.step('Expect password is revealed as plain text', async () => {
      await expect(this.utils.getByText(password)).toBeVisible();
    });
  }
}

import { test } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class ContactsListScreen {
  private readonly utils: MobileUtils;

  private readonly searchBar: Locator;
  private readonly sectionTitle: Locator;
  private readonly emptyStateText: Locator;
  private readonly addButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.searchBar = this.utils.getByTestId('com.google.android.contacts:id/open_search_bar');
    this.sectionTitle = this.utils.getByText('All contacts');
    this.emptyStateText = this.utils.getByText('No contacts yet');
    this.addButton = this.utils.getByTestId('com.google.android.contacts:id/floating_action_button');
  }

  async tapAdd(): Promise<void> {
    await test.step('Tap Add (FAB)', async () => {
      await this.utils.tap(this.addButton);
    });
  }

  async search(query: string): Promise<void> {
    await test.step(`Search for "${query}"`, async () => {
      await this.utils.tap(this.searchBar);
      await this.utils.fill(this.searchBar, query);
    });
  }

  async openContact(name: string): Promise<void> {
    await test.step(`Open contact "${name}"`, async () => {
      await this.utils.tap(this.utils.getByText(name));
    });
  }

  async expectAtListScreen(): Promise<void> {
    await test.step('Expect at Contacts list screen', async () => {
      await this.utils.expectVisible(this.sectionTitle);
    });
  }

  async expectEmpty(): Promise<void> {
    await test.step('Expect empty Contacts list', async () => {
      await this.utils.expectVisible(this.emptyStateText);
    });
  }

  async expectContactInList(name: string): Promise<void> {
    await test.step(`Expect contact "${name}" in list`, async () => {
      await this.utils.expectVisible(this.utils.getByText(name));
    });
  }

  async expectContactNotInList(name: string): Promise<void> {
    await test.step(`Expect contact "${name}" not in list`, async () => {
      await this.utils.expectHidden(this.utils.getByText(name));
    });
  }
}

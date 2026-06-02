import { test } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../utils/mobile.utils';

export class ContactsListScreen {
  private readonly utils: MobileUtils;

  private readonly back: Locator;
  private readonly title: Locator;
  private readonly searchField: Locator;
  private readonly dictateButton: Locator;
  private readonly addButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.back = this.utils.getByTestId('BackButton');
    this.title = this.utils.getByText('Contacts');
    this.searchField = this.utils.getByTestId('Search');
    this.dictateButton = this.utils.getByTestId('Dictate');
    this.addButton = this.utils.getByTestId('Add');
  }

  async tapAdd(): Promise<void> {
    await test.step('Tap Add button', async () => {
      await this.utils.tap(this.addButton);
    });
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back', async () => {
      await this.utils.tap(this.back);
    });
  }

  async search(query: string): Promise<void> {
    await test.step(`Search for "${query}"`, async () => {
      await this.utils.tap(this.searchField);
      await this.utils.fill(this.searchField, query);
    });
  }

  async tapDictate(): Promise<void> {
    await test.step('Tap Dictate', async () => {
      await this.utils.tap(this.dictateButton);
    });
  }

  async openContact(name: string): Promise<void> {
    await test.step(`Open contact "${name}"`, async () => {
      await this.utils.tap(this.utils.getByText(name));
    });
  }

  async expectAtListScreen(): Promise<void> {
    await test.step('Expect at Contacts list screen', async () => {
      await this.utils.expectVisible(this.title);
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

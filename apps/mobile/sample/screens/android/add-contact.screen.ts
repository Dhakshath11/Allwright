import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

// Android Google Contacts "Create contact" form. Diverges from iOS:
//   - Header text is "Create contact", not "New Contact".
//   - Top-right action is "Save" (TextView), not "Done" (testId).
//   - Back affordance is the "Cancel" View (label), not "close" (testId).
//   - Company is rendered as a TextView label only — no EditText sibling
//     visible in the dump, so `fillBasics` accepts firstName + lastName
//     only. If company input is required later, capture a fresh dump
//     after expanding "More fields" and add it then.
export class AddContactScreen {
  private readonly utils: MobileUtils;

  private readonly header: Locator;
  private readonly cancelButton: Locator;
  private readonly saveButton: Locator;
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly company: Locator;
  private readonly addPhotoButton: Locator;
  private readonly addToFavoritesButton: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.header = this.utils.getByText('Create contact');
    this.cancelButton = this.utils.getByLabel('Cancel');
    this.saveButton = this.utils.getByText('Save');
    this.firstName = this.utils.getByLabel('First name');
    this.lastName = this.utils.getByLabel('Last name');
    this.company = this.utils.getByText('Company');
    this.addPhotoButton = this.utils.getByLabel('Add contact photo');
    this.addToFavoritesButton = this.utils.getByLabel('Add to Favorites');
  }

  async fillBasics({ firstName, lastName, company }: {
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<void> {
    await test.step(`Fill basics: ${firstName} ${lastName} ${company}`, async () => {
      await this.utils.fill(this.firstName, firstName);
      await this.utils.fill(this.lastName, lastName);
      await this.utils.fill(this.company, company);
    });
  }

  async save(): Promise<void> {
    await test.step('Save new contact', async () => {
      await this.utils.tap(this.saveButton);
    });
  }

  async cancel(): Promise<void> {
    await test.step('Cancel new contact', async () => {
      await this.utils.tap(this.cancelButton);
    });
  }

  async tapAddPhoto(): Promise<void> {
    await test.step('Tap Add Photo', async () => {
      await this.utils.tap(this.addPhotoButton);
    });
  }

  async tapAddToFavorites(): Promise<void> {
    await test.step('Tap Add to Favorites', async () => {
      await this.utils.tap(this.addToFavoritesButton);
    });
  }

  async expectAtAddScreen(): Promise<void> {
    await test.step('Expect at Create Contact screen', async () => {
      await expect(this.header).toBeVisible();
    });
  }
}

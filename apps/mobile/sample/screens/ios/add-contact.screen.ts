import { test } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class AddContactScreen {
  private readonly utils: MobileUtils;

  private readonly closeButton: Locator;
  private readonly header: Locator;
  private readonly done: Locator;
  private readonly addPhoto: Locator;
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly company: Locator;
  private readonly addPhone: Locator;
  private readonly addEmail: Locator;
  private readonly addPronouns: Locator;
  private readonly addUrl: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.closeButton = this.utils.getByTestId('close');
    this.header = this.utils.getByText('New Contact');
    this.done = this.utils.getByTestId('Done');
    this.addPhoto = this.utils.getByTestId('Add photo');
    this.firstName = this.utils.getByTestId('First name');
    this.lastName = this.utils.getByTestId('Last name');
    this.company = this.utils.getByTestId('Company');
    this.addPhone = this.utils.getByTestId('Insert add phone');
    this.addEmail = this.utils.getByTestId('Insert add email');
    this.addPronouns = this.utils.getByTestId('Insert add pronouns');
    this.addUrl = this.utils.getByTestId('Insert add url');
  }

  async fillBasics({ firstName, lastName, company }: {
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<void> {
    await test.step(`Fill basics: ${firstName} ${lastName}, ${company}`, async () => {
      await this.utils.fill(this.firstName, firstName);
      await this.utils.fill(this.lastName, lastName);
      await this.utils.fill(this.company, company);
    });
  }

  async save(): Promise<void> {
    await test.step('Save new contact', async () => {
      await this.utils.tap(this.done);
    });
  }

  async cancel(): Promise<void> {
    await test.step('Cancel new contact', async () => {
      await this.utils.tap(this.closeButton);
    });
  }

  async tapAddPhoto(): Promise<void> {
    await test.step('Tap Add Photo', async () => {
      await this.utils.tap(this.addPhoto);
    });
  }

  async tapAddPhone(): Promise<void> {
    await test.step('Tap Add Phone', async () => {
      await this.utils.tap(this.addPhone);
    });
  }

  async tapAddEmail(): Promise<void> {
    await test.step('Tap Add Email', async () => {
      await this.utils.tap(this.addEmail);
    });
  }

  async tapAddPronouns(): Promise<void> {
    await test.step('Tap Add Pronouns', async () => {
      await this.utils.tap(this.addPronouns);
    });
  }

  async tapAddUrl(): Promise<void> {
    await test.step('Tap Add URL', async () => {
      await this.utils.tap(this.addUrl);
    });
  }

  async expectAtAddScreen(): Promise<void> {
    await test.step('Expect at New Contact screen', async () => {
      await this.utils.expectVisible(this.header);
    });
  }
}

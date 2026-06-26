import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

// Android Google Contacts "Edit contact" form. Diverges from iOS edit:
//   - Header text is "Edit contact" (header is the discriminator).
//   - Top-right action is "Save" (TextView), not "Done" (testId).
//   - Phone EditText is rendered immediately — there is NO "Insert add
//     phone" intermediate step (iOS requires tapping it first). The
//     pre-filled "+1" is a country-code prefix overlaid by the 🇺🇸 flag
//     TextView; mobilewright's `fill` replaces it with the dialed number.
//   - **Delete is NOT here.** Android exposes Delete on the detail
//     screen, not in the edit form (see `ContactDetailScreen.scrollToDelete`).
export class EditContactScreen {
  private readonly utils: MobileUtils;

  private readonly header: Locator;
  private readonly cancelButton: Locator;
  private readonly saveButton: Locator;
  private readonly firstName: Locator;
  private readonly lastName: Locator;
  private readonly company: Locator;
  private readonly mobileField: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.header = this.utils.getByText('Edit contact');
    this.cancelButton = this.utils.getByLabel('Cancel');
    this.saveButton = this.utils.getByText('Save');
    this.firstName = this.utils.getByLabel('First name');
    this.lastName = this.utils.getByLabel('Last name');
    this.company = this.utils.getByText('Company');
    // The phone EditText has no label / no resource-id in the dump —
    // its only unique content is the "+1" prefix it ships with. Resolved
    // lazily, so a later `fill` happens before the prefix is overwritten.
    // If a contact already has a phone, this locator must change to
    // target the populated field (capture a fresh dump in that state).
    this.mobileField = this.utils.getByText('+1');
  }

  async fillMobile({ value }: { value: string }): Promise<void> {
    await test.step(`Fill mobile number "${value}"`, async () => {
      // TODO: Add the .clear() to clear the +1 and pass +91 in the Text-Value
      await this.utils.fill(this.mobileField, value);
    });
  }

  async fillCompany({ value }: { value: string }): Promise<void> {
    await test.step(`Fill company "${value}"`, async () => {
      await this.utils.fill(this.company, value);
    });
  }

  async fillFirstName({ value }: { value: string }): Promise<void> {
    await test.step(`Fill first name "${value}"`, async () => {
      await this.utils.fill(this.firstName, value);
    });
  }

  async fillLastName({ value }: { value: string }): Promise<void> {
    await test.step(`Fill last name "${value}"`, async () => {
      await this.utils.fill(this.lastName, value);
    });
  }

  async save(): Promise<void> {
    await test.step('Save edited contact', async () => {
      await this.utils.tap(this.saveButton);
    });
  }

  async cancel(): Promise<void> {
    await test.step('Cancel edit', async () => {
      await this.utils.tap(this.cancelButton);
    });
  }

  async expectAtEditScreen(): Promise<void> {
    await test.step('Expect at Edit Contact screen', async () => {
      await expect(this.header).toBeVisible();
    });
  }
}

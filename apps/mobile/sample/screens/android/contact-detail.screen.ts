import { test } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

// Android Google Contacts detail screen. Diverges from iOS detail in
// two important ways:
//   - The Edit affordance is the toolbar Button labeled "Edit contact"
//     (resource-id `menu_insert_or_edit`), NOT a text link.
//   - **Delete lives on THIS screen**, not behind the edit form. It's
//     a TextView under the bottom "Contact settings" section (after
//     "Share contact" / "Add to home screen") and requires a scroll
//     to bring into view on most devices.
//
// Lesson #10 — `expectAtDetailScreen` discriminates the detail screen
// by asserting BOTH the contact name (`large_title`) AND the Edit
// button are visible. The name alone could match on other screens
// (e.g. list, search results); the Edit button is unique to detail.
export class ContactDetailScreen {
  private readonly utils: MobileUtils;

  private readonly backButton: Locator;
  private readonly favoritesButton: Locator;
  private readonly editButton: Locator;
  private readonly settingsButton: Locator;
  private readonly title: Locator;
  private readonly organization: Locator;
  private readonly deleteEntry: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    this.backButton = this.utils.getByTestId('com.google.android.contacts:id/nav_back_icon');
    this.favoritesButton = this.utils.getByTestId('com.google.android.contacts:id/menu_star');
    this.editButton = this.utils.getByTestId('com.google.android.contacts:id/menu_insert_or_edit');
    this.settingsButton = this.utils.getByTestId('com.google.android.contacts:id/menu_settings');
    this.title = this.utils.getByTestId('com.google.android.contacts:id/large_title');
    this.organization = this.utils.getByTestId('com.google.android.contacts:id/organization_name');
    this.deleteEntry = this.utils.getByText('Delete');
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back', async () => {
      await this.utils.tap(this.backButton);
    });
  }

  async tapEdit(): Promise<void> {
    await test.step('Tap Edit contact', async () => {
      await this.utils.tap(this.editButton);
    });
  }

  async tapFavorites(): Promise<void> {
    await test.step('Tap Add to Favorites', async () => {
      await this.utils.tap(this.favoritesButton);
    });
  }

  async tapSettings(): Promise<void> {
    await test.step('Tap Contact settings', async () => {
      await this.utils.tap(this.settingsButton);
    });
  }

  // The "Delete" TextView sits at the bottom of the detail screen's
  // ScrollView (under "Contact settings" → "Share contact" → "Add to
  // home screen"). On smaller viewports it's below the fold — mirror
  // the iOS scroll-to-reveal pattern via `swipeUntilVisible`.
  async scrollToDelete(): Promise<void> {
    await test.step('Scroll to Delete', async () => {
      await this.utils.swipeUntilVisible(this.deleteEntry, {
        minSwipes: 1,
        maxSwipes: 5,
      });
    });
  }

  async tapDelete(): Promise<void> {
    await test.step('Tap Delete', async () => {
      await this.utils.tap(this.deleteEntry);
    });
  }

  // Android AlertDialogs animate in (~300–500ms). A screenshot or
  // `confirmDelete` taken immediately after `tapDelete` can fire before
  // the dialog has rendered.
  //
  // Discriminator: "Cancel" is a strong dialog-only signal — the detail
  // screen itself has no Cancel element. Waiting for it to become visible
  // bounds the wait by the actual rendering event rather than a magic
  // sleep. Capture a `dump: delete confirmation dialog` if "Cancel" turns
  // out to be the wrong word in your locale or app version.
  async waitForConfirmDialog(): Promise<void> {
    await test.step('Wait for delete confirmation dialog', async () => {
      await this.utils.waitFor(this.utils.getByText('Cancel'), 'visible');
    });
  }

  // After `tapDelete`, Google Contacts shows an AlertDialog with a
  // "Delete" button. The dialog renders AFTER the entry-point TextView
  // in the view tree, so target the LAST match for "Delete".
  //
  // Best-guess locator pending a dialog dump — add a
  // `dump: delete confirmation dialog` test in `_dump_android.spec.ts`
  // if this misfires (don't extrapolate further — see lesson #7).
  async confirmDelete(): Promise<void> {
    await test.step('Confirm Delete', async () => {
      await this.utils.tap(this.utils.getByText('Delete').last());
    });
  }

  async expectAtDetailScreen({ name }: { name: string }): Promise<void> {
    await test.step(`Expect at "${name}" detail screen`, async () => {
      await this.utils.expectVisible(this.title);
      await this.utils.expectText(this.title, name);
      await this.utils.expectVisible(this.editButton);
    });
  }

  async expectOrganization({ company }: { company: string }): Promise<void> {
    await test.step(`Expect organization "${company}"`, async () => {
      await this.utils.expectVisible(this.organization);
      await this.utils.expectText(this.organization, company);
    });
  }

  // Post-edit detail screen wasn't dumped (we only have the pre-edit
  // version with no phone). Android Contacts formats phone numbers
  // locale-dependently (US default formats 10 digits as "(NNN) NNN-NNNN").
  // Match the dialed digits via a regex stripped of separators, which
  // survives any reasonable formatting. Tighten this once we capture
  // a detail-with-phone dump.
  async expectMobileNumber({ dialedNumber }: { dialedNumber: string }): Promise<void> {
    await test.step(`Expect mobile number contains "${dialedNumber}"`, async () => {
      const digitsOnly = dialedNumber.replace(/\D/g, '');
      const pattern = new RegExp(digitsOnly.split('').join('\\D*'));
      await this.utils.expectVisible(this.utils.getByText(pattern));
    });
  }
}

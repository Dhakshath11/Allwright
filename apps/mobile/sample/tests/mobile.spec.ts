import { test } from '@mobilewright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ContactsListScreen } from '../screens/contacts-list.screen';
import { AddContactScreen } from '../screens/add-contact.screen';
import { ContactDetailScreen } from '../screens/contact-detail.screen';
import { EditContactScreen } from '../screens/edit-contact.screen';

test('adds a new contact', async ({ screen }) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.tapAdd();

  const form = new AddContactScreen(screen);
  await form.expectAtAddScreen();
  await form.fillBasics({
    firstName: 'Dhaksh',
    lastName: 'Test',
    company: 'LambdaTest',
  });
  await form.save();

  const detail = new ContactDetailScreen(screen);
  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
});

test('edits a contact and adds a phone number', async ({ screen }) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.openContact('Dhaksh Test');

  const detail = new ContactDetailScreen(screen);
  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
  await detail.tapEdit();

  const edit = new EditContactScreen(screen);
  await edit.expectAtEditScreen();
  await edit.tapAddPhone();
  await edit.fillMobile({ value: '7353242165' });
  await edit.save();

  await detail.expectMobileNumber({ displayedNumber: '73532 42165' });
});

test('deletes a contact', async ({ screen }, testInfo) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.openContact('Dhaksh Test');

  const detail = new ContactDetailScreen(screen);
  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
  await detail.tapEdit();

  const edit = new EditContactScreen(screen);
  await edit.expectAtEditScreen();
  await edit.scrollToDeleteContact();
  await edit.tapDeleteContact();

  // Capture once, then write to disk AND attach to the HTML report.
  // - Disk copy: persistent artifact at apps/mobile/sample/screenshots/
  // - testInfo.attach: surfaces the screenshot in the report's Attachments
  //   panel — `fs.writeFileSync` alone leaves the report blind to the file.
  const screenshotBuffer = await screen.screenshot();
  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, 'delete-contact-confirmation.png');
  fs.writeFileSync(screenshotPath, screenshotBuffer);
  await testInfo.attach('delete-contact-confirmation', {
    body: screenshotBuffer,
    contentType: 'image/png',
  });

  await edit.confirmDeleteContact();

  await list.expectAtListScreen();
  await list.expectContactNotInList('Dhaksh Test');
});

// TODO: iOS system gestures — XCUITest doesn't expose Notification Center,
// app switcher, or home indicator, so each step has to be driven by
// coordinate-based swipes computed from the viewport size.
// 1. Open Notification Center: swipe from top-left corner down to mid-screen.
// 2. Minimize app (go Home) + reopen: swipe bottom-mid → top, then tap the
//    Contacts app icon on the Home screen.
// 3. Clear app-switcher tabs: swipe bottom-mid → center-mid with a brief
//    hold to surface the switcher, then swipe each card center-mid → top
//    to dismiss it.
test.fixme('iOS system gestures: notification center, minimize/reopen, clear app switcher', async () => {
  // Implementation pending — needs coordinate-based gesture primitives on
  // MobileUtils (swipe-with-duration / swipe-by-coords). Confirm whether
  // mobilewright's Screen exposes a hold/dwell on swipe before wiring this up.
});

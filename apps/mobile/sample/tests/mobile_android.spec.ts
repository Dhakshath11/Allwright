import { test } from '@mobilewright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ContactsListScreen } from '../screens/android/contacts-list.screen';
import { AddContactScreen } from '../screens/android/add-contact.screen';
import { ContactDetailScreen } from '../screens/android/contact-detail.screen';
import { EditContactScreen } from '../screens/android/edit-contact.screen';

test.describe.configure({ mode: 'serial' });

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
  await detail.expectOrganization({ company: 'LambdaTest' });
});

test('edits a contact and adds a phone number', async ({ screen }) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.openContact('Dhaksh Test');

  const detail = new ContactDetailScreen(screen);
  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
  await detail.tapEdit();

  // Android shows the phone EditText immediately — no "Insert add phone"
  // intermediate tap is required (iOS-specific divergence).
  const edit = new EditContactScreen(screen);
  await edit.expectAtEditScreen();
  await edit.fillMobile({ value: '7353242165' });
  await edit.save();

  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
  await detail.expectMobileNumber({ dialedNumber: '7353242165' });
});

test('deletes a contact', async ({ screen }, testInfo) => {
  const list = new ContactsListScreen(screen);
  await list.expectAtListScreen();
  await list.openContact('Dhaksh Test');

  const detail = new ContactDetailScreen(screen);
  await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });
  await detail.scrollToDelete();
  await detail.tapDelete();

  // The confirmation AlertDialog animates in (~300–500ms). Wait for it
  // before screenshotting so the report shows the dialog state, not the
  // mid-transition detail screen.
  await detail.waitForConfirmDialog();

  // Capture once, then write to disk AND attach to the HTML report.
  // Mirrors the iOS dual-destination pattern (lesson #9): `fs.writeFileSync`
  // alone leaves the report blind to the file.
  const screenshotBuffer = await screen.screenshot();
  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, 'delete-contact-confirmation-android.png');
  fs.writeFileSync(screenshotPath, screenshotBuffer);
  await testInfo.attach('delete-contact-confirmation-android', {
    body: screenshotBuffer,
    contentType: 'image/png',
  });

  await detail.confirmDelete();

  await list.expectAtListScreen();
  await list.expectContactNotInList('Dhaksh Test');
});

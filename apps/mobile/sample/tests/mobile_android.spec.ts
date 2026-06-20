import { test, expect } from '@mobilewright/test';
import { sleep } from '@mobilewright/core';
import * as fs from 'fs';
import * as path from 'path';
import { ContactsListScreen } from '../screens/android/contacts-list.screen';
import { AddContactScreen } from '../screens/android/add-contact.screen';
import { ContactDetailScreen } from '../screens/android/contact-detail.screen';
import { EditContactScreen } from '../screens/android/edit-contact.screen';
import { MobileUtils } from '../../utils/mobile.utils';

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

test('long-presses a contact, returns Home, then relaunches Contacts', async ({ device, screen }, testInfo) => {
  const utils = new MobileUtils(screen);

  await utils.longPress(utils.getByText('Micheal Bay'));

  // HOME button sends Android to the launcher — fire-and-forget, allow time to settle.
  await utils.pressHardwareButton('HOME');
  await sleep(500);

  const fg = await device.getForegroundApp();
  await testInfo.attach('foreground after HOME', {
    body: JSON.stringify(fg, null, 2),
    contentType: 'application/json',
  });
  // Android launcher package varies by image — assert Contacts is gone, not a specific launcher ID.
  expect(fg.bundleId).not.toBe('com.google.android.contacts');

  await device.launchApp('com.google.android.contacts');
  const resurfaced = await device.getForegroundApp();
  await testInfo.attach('foreground after relaunch', {
    body: JSON.stringify(resurfaced, null, 2),
    contentType: 'application/json',
  });
  expect(resurfaced.bundleId).toBe('com.google.android.contacts');
});

test('opens notification shade from Contacts and dismisses it', async ({ device, screen }, testInfo) => {
  const utils = new MobileUtils(screen);
  const screenSize = await device.screenSize();

  await utils.openNotifications(screenSize);
  await sleep(600);

  const ncScreenshot = await screen.screenshot();
  await testInfo.attach('notification-shade-open', {
    body: ncScreenshot,
    contentType: 'image/png',
  });

  await utils.closeNotifications(screenSize);
  await sleep(400);

  const fg = await device.getForegroundApp();
  await testInfo.attach('foreground after dismiss', {
    body: JSON.stringify(fg, null, 2),
    contentType: 'application/json',
  });
  expect(fg.bundleId).toBe('com.google.android.contacts');
});

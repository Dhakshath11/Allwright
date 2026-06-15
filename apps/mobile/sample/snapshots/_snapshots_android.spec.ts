// Locator-discovery: writes one view-tree JSON per test to
// `apps/mobile/sample/resources/snapshots/<platform>_<state>.json`.
// Run: `npm run test:mobile:snapshots -- --project=android`.

import { test } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';
import { MobileUtils } from '../../utils/mobile.utils';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOTS_DIR = path.join(__dirname, '../resources/snapshots');

// `viewTree` is a dev-only introspection API — deliberately kept out
// of `MobileUtils`. Everything else here uses MobileUtils.
const dump = async (screen: Screen, fileName: string): Promise<void> => {
  const tree = await screen.viewTree();
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(SNAPSHOTS_DIR, fileName),
    JSON.stringify(tree, null, 2),
  );
};

test('dump: contacts list view', async ({ screen }) => {
  await dump(screen, 'android_contacts_list_view.json');
});

test('dump: add contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/floating_action_button'));
  await dump(screen, 'android_add_contact_form.json');
});

// Leaves "Dhaksh Test" in Contacts. `dump: edit contact form` below
// depends on it; re-running this on a populated Contacts will stack
// a second entry.
test('dump: contact detail (post-save)', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/floating_action_button'));
  await utils.fill(utils.getByLabel('First name'), 'Dhaksh');
  await utils.fill(utils.getByLabel('Last name'), 'Test');
  await utils.fill(utils.getByText('Company'), 'LambdaTest');
  await utils.tap(utils.getByText('Save'));
  await dump(screen, 'android_contact_detail.json');
});

test('dump: edit contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByText('Dhaksh Test'));
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/menu_insert_or_edit'));
  await dump(screen, 'android_edit_contact_form.json');
});

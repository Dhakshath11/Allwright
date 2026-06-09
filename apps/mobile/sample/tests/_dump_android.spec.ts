// THROWAWAY locator-discovery spec — delete after the relevant screens are built.
//
// Writes the captured view tree JSON to:
//   apps/mobile/sample/tests/_dump_output.txt
//
// Run all dump states:
//   npm run test:mobile -- _dump
// Or one at a time (faster):
//   cd apps/mobile && mobilewright test --grep "list view"
//
// The `screen-builder` skill consumes the output file.

import { test } from '@mobilewright/test';
import type { Screen } from '@mobilewright/core';
import { MobileUtils } from '../../utils/mobile.utils';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, '_dump_output.txt');
let firstWrite = true;

// `screen.viewTree()` is called directly here (not via MobileUtils) because
// `viewTree` is a developer-only introspection API — deliberately kept out of
// the production facade. Everything else in this file uses MobileUtils.
const dump = async (screen: Screen, label: string): Promise<void> => {
  const tree = await screen.viewTree();
  const block = `===== ${label} =====\n${JSON.stringify(tree, null, 2)}\n===== END ${label} =====\n\n`;
  if (firstWrite) {
    fs.writeFileSync(OUTPUT_FILE, block);
    firstWrite = false;
  } else {
    fs.appendFileSync(OUTPUT_FILE, block);
  }
};

test('dump: contacts list view', async ({ screen }) => {
  await dump(screen, 'CONTACTS LIST VIEW');
});

test('dump: add contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/floating_action_button'));
  await dump(screen, 'ADD CONTACT FORM');
});

// Creates a contact end-to-end and dumps the resulting detail screen.
// The detail screen is where the Edit / Delete affordances live — we
// can't build the contact-detail / edit POMs until we see its view tree.
//
// Side-effect: leaves "Dhaksh Test" in Contacts. The subsequent
// `dump: edit contact form` block depends on it; if you re-run this
// dump after that contact exists, the form-fill steps will silently
// stack a second contact — clear Contacts between runs.
test('dump: contact detail (post-save)', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/floating_action_button'));
  await utils.fill(utils.getByLabel('First name'), 'Dhaksh');
  await utils.fill(utils.getByLabel('Last name'), 'Test');
  await utils.fill(utils.getByText('Company'), 'LambdaTest');
  await utils.tap(utils.getByText('Save'));
  await dump(screen, 'CONTACT DETAIL');
});

// Opens the Edit form for "Dhaksh Test" (assumes the previous dump
// left the contact in place) and dumps it. Use this to build the
// Android EditContactScreen POM — fill out `tapAddPhone`, `fillMobile`,
// `save`, `cancel`, `expectAtEditScreen` from the captured locators.
//
// The Edit affordance on Android is the toolbar Button labeled
// "Edit contact" (resource-id `menu_insert_or_edit`) — confirmed by
// the contact-detail dump.
test('dump: edit contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByText('Dhaksh Test'));
  await utils.tap(utils.getByTestId('com.google.android.contacts:id/menu_insert_or_edit'));
  await dump(screen, 'EDIT CONTACT FORM');
});

// Add more test() blocks as needed for new screen states.
// Pattern:
//   test('dump: <state name>', async ({ screen }) => {
//     const utils = new MobileUtils(screen);
//     // navigation via utils — use locators verified from the prior dump
//     await dump(screen, '<STATE LABEL>');
//   });

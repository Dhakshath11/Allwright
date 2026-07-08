// Locator-discovery: writes one view-tree JSON per test to
// `apps/mobile/sample/resources/snapshots/<platform>_<state>.json`.
// Run: `npm run test:mobile:snapshots -- --project=ios`.

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
  await dump(screen, 'ios_contacts_list_view.json');
});

test('dump: add contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByRole('button', 'Add'));
  await utils.tap(utils.getByRole('button', 'Insert add phone'));
  await dump(screen, 'ios_add_contact_form.json');
});

// Assumes "Dhaksh Test" exists in Contacts (seeded by the `adds a new
// contact` spec). Seed manually if running on a clean simulator.
test('dump: edit contact form', async ({ screen }) => {
  const utils = new MobileUtils(screen);
  await utils.tap(utils.getByText('Dhaksh Test'));
  await utils.tap(utils.getByText('Edit'));
  await dump(screen, 'ios_edit_contact_form.json');
});


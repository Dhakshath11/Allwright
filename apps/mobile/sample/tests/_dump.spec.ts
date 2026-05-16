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
  await utils.tap(utils.getByRole('button', 'Add'));
  await dump(screen, 'ADD CONTACT FORM');
});

// Add more test() blocks as needed for contact detail, edit form, search results, etc.
// Pattern:
//   test('dump: <state name>', async ({ screen }) => {
//     const utils = new MobileUtils(screen);
//     // navigation via utils (e.g. await utils.tap(utils.getByText('Some Contact')))
//     await dump(screen, '<STATE LABEL>');
//   });

// Locator-discovery: writes one accessibility-tree JSON per page state to
// `apps/web/sample/resources/snapshots/chromium_<state>.json`.
// Run: `npm run test:web:snapshots -- --project=chromium`.
//
// The accessibility snapshot is the web equivalent of mobilewright's
// `screen.viewTree()` — it captures the full ARIA role/name tree that
// Playwright's locator API queries against. Use it to identify which
// `getByRole`, `getByLabel`, `getByTestId`, or `getByPlaceholder`
// strategy to use when building a new screen object.
//
// Never delete snapshot JSON files — they are a permanent record of the
// UI at the time of capture. When the UI changes, recapture (overwrite).

import { test } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOTS_DIR = path.join(__dirname, '../resources/snapshots');

const dump = async (page: Page, fileName: string): Promise<void> => {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  // Accessibility tree — primary artifact for locator discovery.
  // ariaSnapshot() returns a YAML string of the full ARIA node tree with
  // roles, names, states (checked, selected, expanded, etc.). Use it to
  // identify which getByRole / getByLabel / getByTestId / getByPlaceholder
  // strategy applies when building a new screen object.
  const tree = await page.locator('body').ariaSnapshot();
  fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${fileName}.yaml`), tree);

  // Screenshot — visual reference alongside the a11y tree.
  const screenshot = await page.screenshot();
  fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${fileName}.png`), screenshot);
};

// Each test navigates independently — Playwright gives each test a fresh page
// (unlike mobilewright which keeps the app open across serial tests).

test('dump: todo list (empty state)', async ({ page }) => {
  await page.goto('/todomvc/#/');
  await dump(page, 'chromium_todo_list_empty');
});

test('dump: todo list (with items)', async ({ page }) => {
  await page.goto('/todomvc/#/');
  await page.fill('input[placeholder="What needs to be done?"]', 'Buy groceries');
  await page.press('input[placeholder="What needs to be done?"]', 'Enter');
  await page.fill('input[placeholder="What needs to be done?"]', 'Read Playwright docs');
  await page.press('input[placeholder="What needs to be done?"]', 'Enter');
  await dump(page, 'chromium_todo_list_with_items');
});

test('dump: todo list (one completed)', async ({ page }) => {
  await page.goto('/todomvc/#/');
  await page.fill('input[placeholder="What needs to be done?"]', 'Buy groceries');
  await page.press('input[placeholder="What needs to be done?"]', 'Enter');
  await page.locator('[data-testid="todo-item"]').first().getByRole('checkbox').check();
  await dump(page, 'chromium_todo_list_one_completed');
});

test('dump: todo list (active filter)', async ({ page }) => {
  await page.goto('/todomvc/#/');
  await page.fill('input[placeholder="What needs to be done?"]', 'Buy groceries');
  await page.press('input[placeholder="What needs to be done?"]', 'Enter');
  await page.fill('input[placeholder="What needs to be done?"]', 'Read Playwright docs');
  await page.press('input[placeholder="What needs to be done?"]', 'Enter');
  await page.locator('[data-testid="todo-item"]').first().getByRole('checkbox').check();
  await page.getByRole('link', { name: 'Active' }).click();
  await dump(page, 'chromium_todo_list_active_filter');
});

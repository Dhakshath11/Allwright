import { test, expect } from '@playwright/test';
import { TodoListSmartScreen } from '../screens/todo-list-smart.screen';
import { LocatorActionError } from '../../../../core/utils/locator-error';

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  // Master switch: enables the fallback-locator chain AND history-based
  // self-healing. Off = only the preferred locator is tried, no fallback/heal.
  process.env['SMART_LOCATOR'] = 'true';
  // Independent of the above — only controls whether a diagnostic DOM/aria
  // snapshot graph is written to smart-snapshots/ during goto() and healing.
  // Does not gate whether healing logic runs.
  process.env['SMART_SNAPSHOT_CAPTURE'] = 'true';
});

test('smart locator fallback adds a todo without touching legacy tests', async ({ page }) => {
  const todos = new TodoListSmartScreen(page);

  await todos.open();
  await todos.expectInputReady();

  await todos.addTodo({ text: 'Smart path todo' });

  await todos.expectTodoCount({ count: 1 });
});

test('smart locator heals from history when preferred and fallback miss', async ({ page }) => {
  const todos = new TodoListSmartScreen(page);

  await todos.open();
  await todos.expectInputReady();

  await todos.addTodoViaSimilarityHeal({ text: 'Smart healed todo' });

  await todos.expectTodoCount({ count: 1 });
});

// ---- Failure : Negative Tests ----

// All three tests below use a registry element whose preferred/fallback/history
// locators are ALL fake — so resolve() exhausts everything and falls through
// to the last-resort suggestion search (§11). Unlike the healing test above,
// the suggestion stage NEVER returns a usable, auto-accepted locator (its
// scoring ceiling is mathematically capped below both healing tiers — see
// SMART_LOCATOR_ARCHITECTURE.md §7.2/§10/§11), so these genuinely fail.
//
// test.fail() mirrors real-world behavior instead of hiding it: Playwright
// runs each test, requires it to actually fail, and — critically — lets the
// real LocatorActionError (message, "Did you mean"/"Closest semantic match"
// hint, stack trace) surface exactly where it naturally occurs in the report,
// the same way a genuinely broken locator would in a real test run. The
// try/catch + re-throw below adds a content check on top: a wrong failure
// reason still fails the assertion (and the test), and if the locator ever
// unexpectedly stops failing (e.g. a future regression accidentally makes it
// resolve), test.fail()'s own contract flags that too ("expected to fail but
// didn't").

test.fail('smart locator suggestion search finds a real id ("Did you mean")', async ({ page }) => {
  const todos = new TodoListSmartScreen(page);

  await todos.open();
  await todos.expectInputReady();
  // Need at least one todo on the page — the real #toggle-all checkbox only
  // renders once the list is non-empty.
  await todos.addTodo({ text: 'Trigger toggle-all suggestion' });

  try {
    await todos.expectToggleAllSuggested();
  } catch (error) {
    expect((error as Error).message).toContain('Did you mean: #toggle-all');
    throw error;
  }
});

test.fail('smart locator suggestion search finds no id ("Closest semantic match")', async ({ page }) => {
  const todos = new TodoListSmartScreen(page);

  await todos.open();
  await todos.expectInputReady();
  await todos.addTodo({ text: 'Trigger clear-completed suggestion' });
  // Mark it completed directly via the raw page — the real "Clear completed"
  // button only renders once at least one todo is completed, and completing a
  // todo isn't itself what this test is exercising.
  await page.locator('.todo-list li .toggle').check();

  try {
    await todos.expectClearCompletedSuggested();
  } catch (error) {
    expect((error as Error).message).toContain('Closest semantic match');
    throw error;
  }
});

// This third case is DIFFERENT from the two above: toggleAllSuggested/clearCompletedSuggested
// both represent a MATCH (score 0.667 — the suggestion stage's scoring ceiling, see §10/§11) that
// differs only by whether the resolved element has a real `id`. completionSliderSuggested's
// recorded role ("slider") doesn't exist anywhere on the real page at all, so every live node's
// role comparison fails — the maximum possible score any node could reach is capped at the name
// field alone (0.25/0.75 ≈ 0.333), safely below SUGGESTION_MIN_SCORE (0.5). findSuggestion
// therefore returns undefined entirely: no hint, no "Did you mean", no "Closest semantic match" —
// just the bare failure message.
test.fail('smart locator suggestion search finds nothing at all (no suggestion)', async ({ page }) => {
  const todos = new TodoListSmartScreen(page);

  await todos.open();
  await todos.expectInputReady();
  await todos.addTodo({ text: 'Trigger no-suggestion case' });

  try {
    await todos.expectCompletionSliderSuggested();
  } catch (error) {
    expect(error).toBeInstanceOf(LocatorActionError);
    const locatorError = error as LocatorActionError;
    expect(locatorError.message).toBe('smartResolve(expectVisible)() failed — locator: completionSliderSuggested');
    expect(locatorError.suggestion).toBeUndefined();
    throw error;
  }
});
import { test } from '@playwright/test';
import { TodoListSmartScreen } from '../screens/todo-list-smart.screen';

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

import { test } from '@playwright/test';
import { TodoListScreen } from '../screens/todo-list.screen';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.goto('/todomvc/#/');
});

test('adds a new todo', async ({ page }) => {
  const todos = new TodoListScreen(page);
  await todos.expectInputReady();

  await todos.addTodo({ text: 'Buy groceries' });

  await todos.expectTodoCount({ count: 1 });
  await todos.expectTodoVisible({ text: 'Buy groceries' });
});

test('completes a todo', async ({ page }) => {
  const todos = new TodoListScreen(page);
  await todos.addTodo({ text: 'Read Playwright docs' });
  await todos.expectTodoVisible({ text: 'Read Playwright docs' });

  await todos.completeTodo({ text: 'Read Playwright docs' });

  await todos.expectTodoCompleted({ text: 'Read Playwright docs' });
});

test('deletes a todo', async ({ page }) => {
  const todos = new TodoListScreen(page);
  await todos.addTodo({ text: 'Write tests' });
  await todos.expectTodoVisible({ text: 'Write tests' });

  await todos.deleteTodo({ text: 'Write tests' });

  await todos.expectTodoNotVisible({ text: 'Write tests' });
  await todos.expectTodoCount({ count: 0 });
});

test('filters active and completed todos', async ({ page }) => {
  const todos = new TodoListScreen(page);
  await todos.addTodo({ text: 'Task A' });
  await todos.addTodo({ text: 'Task B' });
  await todos.completeTodo({ text: 'Task A' });

  await todos.filterByActive();
  await todos.expectTodoNotVisible({ text: 'Task A' });
  await todos.expectTodoVisible({ text: 'Task B' });

  await todos.filterByCompleted();
  await todos.expectTodoVisible({ text: 'Task A' });
  await todos.expectTodoNotVisible({ text: 'Task B' });

  await todos.filterByAll();
  await todos.expectTodoCount({ count: 2 });
});

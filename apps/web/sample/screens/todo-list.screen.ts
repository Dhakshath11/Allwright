import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { WebUtils, WebLocator } from '../../utils/web.utils';

/**
 * TodoMVC main list screen — the only screen state in the app.
 * Target: https://demo.playwright.dev/todomvc
 *
 * Locator priority (per Allwright conventions):
 *   getByTestId > getByLabel > getByRole+name > getByPlaceholder > getByText
 *
 * TodoMVC exposes `data-testid="todo-item"` per item — used as the primary
 * locator. Other elements use role+name where testIds are absent.
 */
export class TodoListScreen {
  private readonly utils: WebUtils;

  private readonly newTodoInput: WebLocator;
  private readonly todoItems: WebLocator;
  private readonly filterAll: WebLocator;
  private readonly filterActive: WebLocator;
  private readonly filterCompleted: WebLocator;
  private readonly clearCompletedBtn: WebLocator;

  constructor(page: Page) {
    this.utils = new WebUtils(page);

    this.newTodoInput = this.utils.getByPlaceholder('What needs to be done?');
    this.todoItems = this.utils.getByTestId('todo-item');
    this.filterAll = this.utils.getByRole('link', 'All');
    this.filterActive = this.utils.getByRole('link', 'Active');
    this.filterCompleted = this.utils.getByRole('link', 'Completed');
    this.clearCompletedBtn = this.utils.getByRole('button', 'Clear completed');
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  async addTodo({ text }: { text: string }): Promise<void> {
    await test.step(`Add todo "${text}"`, async () => {
      await this.utils.fill(this.newTodoInput, text);
      await this.utils.pressKey(this.newTodoInput, 'Enter');
    });
  }

  async completeTodo({ text }: { text: string }): Promise<void> {
    await test.step(`Complete todo "${text}"`, async () => {
      const row = this.utils.filter(this.todoItems, { hasText: text });
      const checkbox = this.utils.getByRoleWithin(row, 'checkbox');
      await this.utils.check(checkbox);
    });
  }

  async deleteTodo({ text }: { text: string }): Promise<void> {
    await test.step(`Delete todo "${text}"`, async () => {
      const row = this.utils.filter(this.todoItems, { hasText: text });
      await this.utils.hover(row);
      // `.destroy` is a CSS-class button that only appears on hover.
      const deleteBtn = this.utils.getByRoleWithin(row, 'button', 'Delete');
      await this.utils.click(deleteBtn);
    });
  }

  async filterByActive(): Promise<void> {
    await test.step('Filter: Active', async () => {
      await this.utils.click(this.filterActive);
    });
  }

  async filterByCompleted(): Promise<void> {
    await test.step('Filter: Completed', async () => {
      await this.utils.click(this.filterCompleted);
    });
  }

  async filterByAll(): Promise<void> {
    await test.step('Filter: All', async () => {
      await this.utils.click(this.filterAll);
    });
  }

  async clearCompleted(): Promise<void> {
    await test.step('Clear completed todos', async () => {
      await this.utils.click(this.clearCompletedBtn);
    });
  }

  // ─── Assertions ───────────────────────────────────────────────────────

  async expectInputReady(): Promise<void> {
    await test.step('Expect new-todo input visible and enabled', async () => {
      await expect(this.newTodoInput.locator).toBeVisible();
      await expect(this.newTodoInput.locator).toBeEnabled();
    });
  }

  async expectTodoVisible({ text }: { text: string }): Promise<void> {
    await test.step(`Expect todo "${text}" visible`, async () => {
      const row = this.utils.filter(this.todoItems, { hasText: text });
      await expect(row.locator).toBeVisible();
    });
  }

  async expectTodoNotVisible({ text }: { text: string }): Promise<void> {
    await test.step(`Expect todo "${text}" not visible`, async () => {
      const row = this.utils.filter(this.todoItems, { hasText: text });
      await expect(row.locator).toBeHidden();
    });
  }

  async expectTodoCompleted({ text }: { text: string }): Promise<void> {
    await test.step(`Expect todo "${text}" marked completed`, async () => {
      const row = this.utils.filter(this.todoItems, { hasText: text });
      const checkbox = this.utils.getByRoleWithin(row, 'checkbox');
      await expect(checkbox.locator).toBeChecked();
    });
  }

  async expectTodoCount({ count }: { count: number }): Promise<void> {
    await test.step(`Expect ${count} todo item(s)`, async () => {
      await expect(this.todoItems.locator).toHaveCount(count);
    });
  }
}

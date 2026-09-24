import { test } from '@playwright/test';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { SmartWebUtils, resolveRegistryPath } from '../../utils/smart-web.utils';
import type { SmartWebLocator } from '../../utils/smart-locator.utils';

const SNAPSHOT_DIR = path.join(__dirname, '../resources/smart-snapshots');

export class TodoListSmartScreen {
  private readonly utils: SmartWebUtils;

  private readonly newTodoInput: SmartWebLocator;
  private readonly newTodoInputHealed: SmartWebLocator;
  private readonly todoItems: SmartWebLocator;

  constructor(page: Page) {
    this.utils = SmartWebUtils.fromRegistryFile(
      page,
      resolveRegistryPath('todo-list-smart.registry.json'),
    );

    this.newTodoInput = this.utils.getByElementId('newTodoInput');
    this.newTodoInputHealed = this.utils.getByElementId('newTodoInputHealed');
    this.todoItems = this.utils.getByElementId('todoItems');
  }

  async open(): Promise<void> {
    await test.step('Open TodoMVC smart path', async () => {
      await this.utils.goto('/todomvc/#/', 'todo-list-smart', SNAPSHOT_DIR);
    });
  }

  async addTodo({ text }: { text: string }): Promise<void> {
    await test.step(`Add todo via smart locator "${text}"`, async () => {
      await this.utils.fill(this.newTodoInput, text);
      await this.utils.pressKey(this.newTodoInput, 'Enter');
    });
  }

  async addTodoViaSimilarityHeal({ text }: { text: string }): Promise<void> {
    await test.step(`Add todo via similarity heal "${text}"`, async () => {
      await this.utils.fill(this.newTodoInputHealed, text);
      await this.utils.pressKey(this.newTodoInputHealed, 'Enter');
    });
  }

  async expectInputReady(): Promise<void> {
    await test.step('Expect smart input visible', async () => {
      await this.utils.expectVisible(this.newTodoInput);
    });
  }

  async expectTodoCount({ count }: { count: number }): Promise<void> {
    await test.step(`Expect ${count} smart todo item(s)`, async () => {
      await this.utils.expectCount(this.todoItems, count);
    });
  }
}

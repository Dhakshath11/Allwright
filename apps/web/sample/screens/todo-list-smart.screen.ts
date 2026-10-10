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
  // Both preferred/fallback/history locators are deliberately fake for these three —
  // every candidate misses, forcing resolve() all the way to the suggestion-search
  // stage (§11). See SMART_LOCATOR_ARCHITECTURE.md §7.2 for the three possible outcomes:
  // matched+id, matched+no-id, and (completionSliderSuggested) not matched at all —
  // its role ("slider") doesn't exist anywhere on the real page, so no live node can
  // score high enough to even be reported as a suggestion.
  private readonly toggleAllSuggested: SmartWebLocator;
  private readonly clearCompletedSuggested: SmartWebLocator;
  private readonly completionSliderSuggested: SmartWebLocator;

  constructor(page: Page) {
    this.utils = SmartWebUtils.fromRegistryFile(
      page,
      resolveRegistryPath('todo-list-smart.registry.json'),
    );

    this.newTodoInput = this.utils.getByElementId('newTodoInput');
    this.newTodoInputHealed = this.utils.getByElementId('newTodoInputHealed');
    this.todoItems = this.utils.getByElementId('todoItems');
    this.toggleAllSuggested = this.utils.getByElementId('toggleAllSuggested');
    this.clearCompletedSuggested = this.utils.getByElementId('clearCompletedSuggested');
    this.completionSliderSuggested = this.utils.getByElementId('completionSliderSuggested');
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

  // expectVisible calls resolvePlaywrightLocator() directly with no try/catch wrapper, so the
  // thrown LocatorActionError keeps its full "Did you mean"/"Closest semantic match" message and
  // suggestion intact. fill()/click()/pressKey() now also preserve this (they re-throw an already-
  // formed LocatorActionError as-is instead of re-wrapping it) — expectVisible is used here mainly
  // for narrative clarity, not to work around any remaining asymmetry.
  async expectToggleAllSuggested(): Promise<void> {
    await test.step('Expect toggle-all (forces suggestion search — real element has an id)', async () => {
      await this.utils.expectVisible(this.toggleAllSuggested);
    });
  }

  async expectClearCompletedSuggested(): Promise<void> {
    await test.step('Expect clear-completed (forces suggestion search — real element has no id)', async () => {
      await this.utils.expectVisible(this.clearCompletedSuggested);
    });
  }

  async expectCompletionSliderSuggested(): Promise<void> {
    await test.step('Expect completion-slider (forces suggestion search — nothing on the real page matches at all)', async () => {
      await this.utils.expectVisible(this.completionSliderSuggested);
    });
  }
}

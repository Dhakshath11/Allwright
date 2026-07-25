import type { Page, Locator } from '@playwright/test';

// AriaRole is not a named export in @playwright/test — infer it from the
// getByRole signature, same pattern used in mobile.utils.ts for HardwareButton.
type AriaRole = Parameters<Page['getByRole']>[0];
import { expect } from '@playwright/test';
import { CoreUtils } from '../../../core/utils/core.utils';
import { LocatorActionError } from '../../../core/utils/locator-error';
import type { LocatorLike, WaitState } from '../../../core/contracts/locator.contract';
import type { LocatorRoot } from '../../../core/contracts/root.contract';

// ─── WebLocator ──────────────────────────────────────────────────────────────
// Wraps Playwright's Locator to satisfy LocatorLike so WebUtils can extend
// CoreUtils<WebLocator, WebPage> — the same pattern as MobileUtils extending
// CoreUtils<Locator, Screen> on the mobile surface.
//
// Key mappings from the LocatorLike contract to Playwright's API:
//   tap()        → click()      (no touch-tap on web; click is primary)
//   getText()    → innerText()  (Playwright uses innerText, not getText)
//   getValue()   → inputValue() (Playwright uses inputValue for form inputs)
//   isSelected() → aria-selected attribute check via evaluate()
//   isFocused()  → activeElement comparison via evaluate()
//   waitFor 'enabled'/'disabled' → Playwright's toBeEnabled/toBeDisabled
//
// The public `locator` field gives screen objects Playwright's native Locator
// for `expect(field.locator)` calls — the only surface-level difference from
// the mobile pattern where mobilewright's Locator is used directly.

export class WebLocator implements LocatorLike {
  constructor(readonly locator: Locator) {}

  async tap(): Promise<void> {
    await this.locator.click();
  }

  async fill(text: string): Promise<void> {
    await this.locator.fill(text);
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    await this.locator.scrollIntoViewIfNeeded();
  }

  async isVisible(): Promise<boolean> { return this.locator.isVisible(); }
  async isEnabled(): Promise<boolean> { return this.locator.isEnabled(); }
  async isChecked(): Promise<boolean> { return this.locator.isChecked(); }

  async isSelected(): Promise<boolean> {
    return (await this.locator.getAttribute('aria-selected')) === 'true';
  }

  async isFocused(): Promise<boolean> {
    try {
      await expect(this.locator).toBeFocused({ timeout: 0 });
      return true;
    } catch {
      return false;
    }
  }

  async getText(): Promise<string> {
    return (await this.locator.innerText()) ?? '';
  }

  async getValue(): Promise<string> {
    return this.locator.inputValue();
  }

  async waitFor(options: { state: WaitState; timeout?: number }): Promise<void> {
    const { state, timeout } = options;
    if (state === 'visible' || state === 'hidden') {
      await this.locator.waitFor({ state, timeout });
    } else if (state === 'enabled') {
      await this.locator.waitFor({ state: 'visible', timeout });
      await expect(this.locator).toBeEnabled({ timeout });
    } else {
      await this.locator.waitFor({ state: 'visible', timeout });
      await expect(this.locator).toBeDisabled({ timeout });
    }
  }

  first(): this { return new WebLocator(this.locator.first()) as this; }
  last(): this { return new WebLocator(this.locator.last()) as this; }
  nth(index: number): this { return new WebLocator(this.locator.nth(index)) as this; }
  async count(): Promise<number> { return this.locator.count(); }

  async all(): Promise<this[]> {
    const all = await this.locator.all();
    return all.map(l => new WebLocator(l) as this);
  }
}

// ─── WebPage (internal) ──────────────────────────────────────────────────────
// Bridges Playwright's Page to LocatorRoot<WebLocator>. Not exported —
// WebUtils is the only consumer. The `page` field is accessed via
// `WebUtils.page` for navigation and keyboard operations.

class WebPage implements LocatorRoot<WebLocator> {
  constructor(readonly page: Page) {}

  getByText(text: string | RegExp, opts?: { exact?: boolean }): WebLocator {
    return new WebLocator(this.page.getByText(text, opts));
  }

  getByTestId(testId: string): WebLocator {
    return new WebLocator(this.page.getByTestId(testId));
  }

  getByPlaceholder(placeholder: string, opts?: { exact?: boolean }): WebLocator {
    return new WebLocator(this.page.getByPlaceholder(placeholder, opts));
  }

  getByLabel(label: string, opts?: { exact?: boolean }): WebLocator {
    return new WebLocator(this.page.getByLabel(label, opts));
  }

  async screenshot(opts?: { format?: 'png' | 'jpeg'; quality?: number }): Promise<Buffer> {
    const { format, quality } = opts ?? {};
    return this.page.screenshot({ type: format, quality });
  }
}

// ─── WebUtils ────────────────────────────────────────────────────────────────

/**
 * Web-surface utility — inherits the common CoreUtils API and adds
 * web-only primitives (click, hover, keyboard, navigation, drag) and
 * Playwright-native locator composition (filter, getByRoleWithin).
 *
 * Usage in screen objects:
 *   private readonly utils: WebUtils;
 *   private readonly title: WebLocator;   // typed field
 *   ...
 *   constructor(page: Page) {
 *     this.utils = new WebUtils(page);
 *     this.title = this.utils.getByRole('heading', 'My App');
 *   }
 *   async expectAtScreen(): Promise<void> {
 *     await test.step('...', async () => {
 *       await expect(this.title.locator).toBeVisible();  // .locator for Playwright expect
 *     });
 *   }
 */
export class WebUtils extends CoreUtils<WebLocator, WebPage> {
  constructor(page: Page) {
    super(new WebPage(page));
  }

  get page(): Page {
    return this.root.page;
  }

  // ─── Web-scoped role finder ──────────────────────────────────────────
  // Uses Playwright's built-in AriaRole union — no custom aria.types.ts
  // needed on the web surface unlike mobile which maintains its own narrow
  // set mapped to mobilewright's internal ROLE_TYPE_MAP.

  getByRole(role: AriaRole, name?: string | RegExp): WebLocator {
    const raw = this.root.page.getByRole(role, name !== undefined ? { name } : undefined);
    const desc = name !== undefined
      ? `getByRole('${role}', '${String(name)}')`
      : `getByRole('${role}')`;
    return this.describe(new WebLocator(raw), desc);
  }

  // ─── Locator composition ─────────────────────────────────────────────
  // Covers the most common web patterns — filtering a list locator by text
  // content and finding a role within a container — without reaching into
  // the raw Playwright API at the screen layer.

  filter(
    locator: WebLocator,
    options: { hasText?: string | RegExp },
  ): WebLocator {
    return this.describe(
      new WebLocator(locator.locator.filter(options)),
      `${this.descriptionOf(locator)}.filter(${JSON.stringify(options)})`,
    );
  }

  getByRoleWithin(
    container: WebLocator,
    role: AriaRole,
    name?: string | RegExp,
  ): WebLocator {
    const raw = container.locator.getByRole(role, name !== undefined ? { name } : undefined);
    const desc = name !== undefined
      ? `${this.descriptionOf(container)} >> getByRole('${role}', '${String(name)}')`
      : `${this.descriptionOf(container)} >> getByRole('${role}')`;
    return this.describe(new WebLocator(raw), desc);
  }

  locatorWithin(container: WebLocator, inner: WebLocator): WebLocator {
    return this.describe(
      new WebLocator(container.locator.locator(inner.locator)),
      `${this.descriptionOf(container)} >> ${this.descriptionOf(inner)}`,
    );
  }

  // ─── Web-only locator actions ────────────────────────────────────────
  // `tap` in CoreUtils maps to click via WebLocator.tap(). `click` is an
  // explicit alias so screen code reads naturally on the web surface.

  async click(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.click();
    } catch (cause) {
      throw new LocatorActionError('click', this.descriptionOf(locator), cause);
    }
  }

  async dblClick(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.dblclick();
    } catch (cause) {
      throw new LocatorActionError('dblClick', this.descriptionOf(locator), cause);
    }
  }

  async hover(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.hover();
    } catch (cause) {
      throw new LocatorActionError('hover', this.descriptionOf(locator), cause);
    }
  }

  async clear(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.clear();
    } catch (cause) {
      throw new LocatorActionError('clear', this.descriptionOf(locator), cause);
    }
  }

  async pressKey(locator: WebLocator, key: string): Promise<void> {
    try {
      await locator.locator.press(key);
    } catch (cause) {
      throw new LocatorActionError(`pressKey('${key}')`, this.descriptionOf(locator), cause);
    }
  }

  async selectOption(locator: WebLocator, value: string): Promise<void> {
    try {
      await locator.locator.selectOption(value);
    } catch (cause) {
      throw new LocatorActionError('selectOption', this.descriptionOf(locator), cause);
    }
  }

  async check(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.check();
    } catch (cause) {
      throw new LocatorActionError('check', this.descriptionOf(locator), cause);
    }
  }

  async uncheck(locator: WebLocator): Promise<void> {
    try {
      await locator.locator.uncheck();
    } catch (cause) {
      throw new LocatorActionError('uncheck', this.descriptionOf(locator), cause);
    }
  }

  async dragTo(source: WebLocator, target: WebLocator): Promise<void> {
    try {
      await source.locator.dragTo(target.locator);
    } catch (cause) {
      throw new LocatorActionError(
        `dragTo(${this.descriptionOf(target)})`,
        this.descriptionOf(source),
        cause,
      );
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────

  async goto(url: string): Promise<void> {
    await this.root.page.goto(url);
  }

  async reload(): Promise<void> {
    await this.root.page.reload();
  }

  async goBack(): Promise<void> {
    await this.root.page.goBack();
  }

  async goForward(): Promise<void> {
    await this.root.page.goForward();
  }

  async waitForUrl(url: string | RegExp): Promise<void> {
    await this.root.page.waitForURL(url);
  }

  // ─── Keyboard (page-level) ───────────────────────────────────────────

  async pressPageKey(key: string): Promise<void> {
    await this.root.page.keyboard.press(key);
  }

  async typeText(text: string): Promise<void> {
    await this.root.page.keyboard.type(text);
  }
}

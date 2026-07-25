import type { LocatorLike, WaitState } from '../contracts/locator.contract';
import type { LocatorRoot } from '../contracts/root.contract';
import { LocatorActionError } from './locator-error';

/**
 * Surface-agnostic facade over a locator-root + locator pair. Subclassed by
 * surface-specific util classes (MobileUtils, WebUtils).
 *
 * Methods here are the *common* operations available on every locator-based
 * surface. Surface-specific operations (mobile gestures, web hover, etc.)
 * live in the subclass.
 *
 * `root` is the entry point of the locator hierarchy — mobilewright's `Screen`
 * or Playwright's `Page`. The name is intentionally neutral; do not leak
 * surface-specific terminology into this layer.
 */
export class CoreUtils<
  L extends LocatorLike = LocatorLike,
  R extends LocatorRoot<L> = LocatorRoot<L>,
> {
  // Tracks a human-readable description for every locator this instance creates.
  // WeakMap so entries are collected when the locator itself is GC'd — no leak.
  private readonly _locatorDescriptions = new WeakMap<object, string>();

  constructor(protected readonly root: R) {}

  // ─── Description registry ────────────────────────────────────────────────
  // `describe` is protected so surface subclasses (MobileUtils) can register
  // their surface-specific finders (getByRole, getByType) in the same map.

  protected describe(locator: L, description: string): L {
    this._locatorDescriptions.set(locator, description);
    return locator;
  }

  protected descriptionOf(locator: L): string {
    return this._locatorDescriptions.get(locator) ?? '<unknown locator>';
  }

  // ─── Locator finding ─────────────────────────────────────────────────────
  // `getByRole` is intentionally absent — ARIA role unions differ between
  // surfaces (mobile vs. web), so each surface declares its own `getByRole`
  // with its own role type on its util subclass.

  getByText(text: string | RegExp, opts?: { exact?: boolean }): L {
    const desc = typeof text === 'string' ? `getByText('${text}')` : `getByText(${text})`;
    return this.describe(this.root.getByText(text, opts), desc);
  }

  getByTestId(testId: string): L {
    return this.describe(this.root.getByTestId(testId), `getByTestId('${testId}')`);
  }

  getByPlaceholder(placeholder: string, opts?: { exact?: boolean }): L {
    return this.describe(this.root.getByPlaceholder(placeholder, opts), `getByPlaceholder('${placeholder}')`);
  }

  getByLabel(label: string, opts?: { exact?: boolean }): L {
    return this.describe(this.root.getByLabel(label, opts), `getByLabel('${label}')`);
  }

  // ─── Locator actions ─────────────────────────────────────────────────────

  async tap(locator: L): Promise<void> {
    try {
      await locator.tap();
    } catch (cause) {
      throw new LocatorActionError('tap', this.descriptionOf(locator), cause);
    }
  }

  async fill(locator: L, text: string): Promise<void> {
    try {
      await locator.fill(text);
    } catch (cause) {
      throw new LocatorActionError('fill', this.descriptionOf(locator), cause);
    }
  }

  async scrollIntoView(locator: L): Promise<void> {
    try {
      await locator.scrollIntoViewIfNeeded();
    } catch (cause) {
      throw new LocatorActionError('scrollIntoView', this.descriptionOf(locator), cause);
    }
  }

  // ─── Locator queries ─────────────────────────────────────────────────────
  // Boolean checks rarely throw — no enrichment needed. getText/getValue can
  // throw when the element is absent, so they are wrapped.

  async isVisible(locator: L): Promise<boolean> { return locator.isVisible(); }
  async isEnabled(locator: L): Promise<boolean> { return locator.isEnabled(); }
  async isSelected(locator: L): Promise<boolean> { return locator.isSelected(); }
  async isFocused(locator: L): Promise<boolean> { return locator.isFocused(); }
  async isChecked(locator: L): Promise<boolean> { return locator.isChecked(); }

  async getText(locator: L): Promise<string> {
    try {
      return await locator.getText();
    } catch (cause) {
      throw new LocatorActionError('getText', this.descriptionOf(locator), cause);
    }
  }

  async getValue(locator: L): Promise<string> {
    try {
      return await locator.getValue();
    } catch (cause) {
      throw new LocatorActionError('getValue', this.descriptionOf(locator), cause);
    }
  }

  // ─── Waits ───────────────────────────────────────────────────────────────

  async waitFor(locator: L, state: WaitState, timeout?: number): Promise<void> {
    try {
      await locator.waitFor({ state, timeout });
    } catch (cause) {
      // Include the expected state in the description so the error is self-contained.
      throw new LocatorActionError('waitFor', `${this.descriptionOf(locator)} [state: '${state}']`, cause);
    }
  }

  // ─── Collection ──────────────────────────────────────────────────────────
  // Chain the parent's description so derived locators stay traceable.

  first(locator: L): L {
    return this.describe(locator.first(), `${this.descriptionOf(locator)}.first()`);
  }

  last(locator: L): L {
    return this.describe(locator.last(), `${this.descriptionOf(locator)}.last()`);
  }

  nth(locator: L, index: number): L {
    return this.describe(locator.nth(index), `${this.descriptionOf(locator)}.nth(${index})`);
  }

  async count(locator: L): Promise<number> { return locator.count(); }

  async all(locator: L): Promise<L[]> {
    const items = await locator.all();
    const baseDesc = this.descriptionOf(locator);
    items.forEach((item, i) => this.describe(item, `${baseDesc}[${i}]`));
    return items;
  }

  // ─── Root-level actions ──────────────────────────────────────────────────

  async screenshot(opts?: { format?: 'png' | 'jpeg'; quality?: number }): Promise<Buffer> {
    return this.root.screenshot(opts);
  }
}

import type { LocatorLike, WaitState } from '../contracts/locator.contract';
import type { LocatorRoot } from '../contracts/root.contract';

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
  constructor(protected readonly root: R) {}

  // ─── Locator finding ────────────────────────────────────────────────
  // `getByRole` is intentionally absent — ARIA role unions differ between
  // surfaces (mobile vs. web), so each surface declares its own `getByRole`
  // with its own role type on its util subclass.

  getByText(text: string | RegExp, opts?: { exact?: boolean }): L {
    return this.root.getByText(text, opts);
  }

  getByTestId(testId: string): L {
    return this.root.getByTestId(testId);
  }

  getByPlaceholder(placeholder: string, opts?: { exact?: boolean }): L {
    return this.root.getByPlaceholder(placeholder, opts);
  }

  getByLabel(label: string, opts?: { exact?: boolean }): L {
    return this.root.getByLabel(label, opts);
  }

  // ─── Locator actions ────────────────────────────────────────────────

  async tap(locator: L): Promise<void> {
    await locator.tap();
  }

  async fill(locator: L, text: string): Promise<void> {
    await locator.fill(text);
  }

  async scrollIntoView(locator: L): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  // ─── Locator queries ────────────────────────────────────────────────

  async isVisible(locator: L): Promise<boolean> { return locator.isVisible(); }
  async isEnabled(locator: L): Promise<boolean> { return locator.isEnabled(); }
  async isSelected(locator: L): Promise<boolean> { return locator.isSelected(); }
  async isFocused(locator: L): Promise<boolean> { return locator.isFocused(); }
  async isChecked(locator: L): Promise<boolean> { return locator.isChecked(); }
  async getText(locator: L): Promise<string> { return locator.getText(); }
  async getValue(locator: L): Promise<string> { return locator.getValue(); }

  // ─── Waits ──────────────────────────────────────────────────────────

  async waitFor(locator: L, state: WaitState, timeout?: number): Promise<void> {
    await locator.waitFor({ state, timeout });
  }

  // ─── Collection ─────────────────────────────────────────────────────

  first(locator: L): L { return locator.first(); }
  last(locator: L): L { return locator.last(); }
  nth(locator: L, index: number): L { return locator.nth(index); }
  async count(locator: L): Promise<number> { return locator.count(); }
  async all(locator: L): Promise<L[]> { return locator.all(); }

  // ─── Root-level actions ─────────────────────────────────────────────

  async screenshot(opts?: { format?: 'png' | 'jpeg'; quality?: number }): Promise<Buffer> {
    return this.root.screenshot(opts);
  }
}

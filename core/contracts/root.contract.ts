import type { LocatorLike } from './locator.contract';

/**
 * The top of a locator hierarchy for a surface — what mobilewright calls
 * `Screen` and Playwright calls `Page`. `LocatorRoot` is the surface-agnostic
 * shape that lets `CoreUtils` work against either without importing them.
 *
 * Note: `getByRole` is intentionally NOT included here. ARIA role enums
 * differ between surfaces (mobile vs. web), so each surface owns its own
 * `AriaRole` type and declares `getByRole` on its own util class.
 */
export interface LocatorRoot<L extends LocatorLike = LocatorLike> {
  getByText(text: string | RegExp, opts?: { exact?: boolean }): L;
  getByTestId(testId: string): L;
  getByPlaceholder(placeholder: string, opts?: { exact?: boolean }): L;
  getByLabel(label: string, opts?: { exact?: boolean }): L;
  screenshot(opts?: { format?: 'png' | 'jpeg'; quality?: number }): Promise<Buffer>;
}

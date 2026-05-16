import { expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { CoreUtils } from '../../../core/utils/core.utils';
import type { AriaRole } from './aria.types';

// TODO — remove these inferred shims when mobilewright exports HardwareButton/SwipeDirection types.
type HardwareButton = Parameters<Screen['pressButton']>[0];
type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Mobile-surface utility — inherits the common CoreUtils API and adds
 * mobile-only primitives (gestures, hardware buttons, coordinate tap)
 * and the `expect*` assertion helpers wired to mobilewright's expect.
 */
export class MobileUtils extends CoreUtils<Locator, Screen> {
  constructor(screen: Screen) {
    super(screen);
  }

  // ─── Mobile-scoped role finder ──────────────────────────────────────
  // Lives here (not in CoreUtils) because ARIA role enums differ between
  // surfaces — see ./aria.types.ts.

  getByRole(role: AriaRole, name?: string | RegExp): Locator {
    return this.root.getByRole(role, name === undefined ? undefined : { name });
  }

  // ─── iOS XCUIElementType finder (no web equivalent) ─────────────────

  getByType(type: string): Locator {
    return this.root.getByType(type);
  }

  // ─── Mobile-only locator actions ────────────────────────────────────

  async doubleTap(locator: Locator): Promise<void> {
    await locator.doubleTap();
  }

  async longPress(locator: Locator, duration?: number): Promise<void> {
    await locator.longPress({ duration });
  }

  async swipeElement(locator: Locator, direction: SwipeDirection): Promise<void> {
    await locator.swipe({ direction });
  }

  // ─── Mobile-only screen actions ─────────────────────────────────────

  async swipeUp(distance?: number, duration?: number): Promise<void> {
    await this.root.swipe('up', { distance, duration });
  }

  async swipeDown(distance?: number, duration?: number): Promise<void> {
    await this.root.swipe('down', { distance, duration });
  }

  async swipeLeft(distance?: number, duration?: number): Promise<void> {
    await this.root.swipe('left', { distance, duration });
  }

  async swipeRight(distance?: number, duration?: number): Promise<void> {
    await this.root.swipe('right', { distance, duration });
  }

  async tapOnCoordinates(x: number, y: number): Promise<void> {
    await this.root.tap(x, y);
  }

  async pressHardwareButton(button: HardwareButton): Promise<void> {
    await this.root.pressButton(button);
  }

  // ─── Assertions (use mobilewright's expect under the hood) ──────────

  async expectVisible(locator: Locator): Promise<void> {
    await expect(locator).toBeVisible();
  }

  async expectHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  async expectEnabled(locator: Locator): Promise<void> {
    await expect(locator).toBeEnabled();
  }

  async expectDisabled(locator: Locator): Promise<void> {
    await expect(locator).toBeDisabled();
  }

  async expectFocused(locator: Locator): Promise<void> {
    await expect(locator).toBeFocused();
  }

  async expectChecked(locator: Locator): Promise<void> {
    await expect(locator).toBeChecked();
  }

  async expectSelected(locator: Locator): Promise<void> {
    await expect(locator).toBeSelected();
  }

  async expectText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toHaveText(text);
  }

  async expectContainText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text);
  }

  async expectValue(locator: Locator, value: string): Promise<void> {
    await expect(locator).toHaveValue(value);
  }
}

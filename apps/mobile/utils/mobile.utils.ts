import type { Screen, Locator, GetByWebViewOptions } from '@mobilewright/core';
import { CoreUtils } from '../../../core/utils/core.utils';
import { LocatorActionError } from '../../../core/utils/locator-error';
import type { AriaRole } from './aria.types';

// TODO — remove these inferred shims when mobilewright exports HardwareButton/SwipeDirection types.
type HardwareButton = Parameters<Screen['pressButton']>[0];
type SwipeDirection = 'up' | 'down' | 'left' | 'right';
type GesturePointers = Parameters<Screen['gesture']>[0]['pointers'];
// WebViewLocator is not re-exported from @mobilewright/core index — infer from Screen.
type WebViewLocator = ReturnType<Screen['getByWebView']>;

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
    const locator = this.root.getByRole(role, name === undefined ? undefined : { name });
    const desc = name !== undefined ? `getByRole('${role}', '${name}')` : `getByRole('${role}')`;
    return this.describe(locator, desc);
  }

  // ─── iOS XCUIElementType finder (no web equivalent) ─────────────────

  getByType(type: string): Locator {
    return this.describe(this.root.getByType(type), `getByType('${type}')`);
  }

  // ─── Mobile-only locator actions ────────────────────────────────────

  async doubleTap(locator: Locator): Promise<void> {
    try {
      await locator.doubleTap();
    } catch (cause) {
      throw new LocatorActionError('doubleTap', this.descriptionOf(locator), cause);
    }
  }

  async longPress(locator: Locator, duration?: number): Promise<void> {
    try {
      await locator.longPress({ duration });
    } catch (cause) {
      throw new LocatorActionError('longPress', this.descriptionOf(locator), cause);
    }
  }

  async swipeElement(locator: Locator, direction: SwipeDirection): Promise<void> {
    try {
      await locator.swipe({ direction });
    } catch (cause) {
      throw new LocatorActionError('swipeElement', this.descriptionOf(locator), cause);
    }
  }

  // ─── Mobile-only screen actions ─────────────────────────────────────

  // duration is intentionally absent — device.io.swipe ignores it (server only reads x1,y1,x2,y2).
  // Use gesture() if you need speed control.
  async swipeUp(distance?: number): Promise<void> {
    await this.root.swipe('up', { distance });
  }

  async swipeDown(distance?: number): Promise<void> {
    await this.root.swipe('down', { distance });
  }

  async swipeLeft(distance?: number): Promise<void> {
    await this.root.swipe('left', { distance });
  }

  async swipeRight(distance?: number): Promise<void> {
    await this.root.swipe('right', { distance });
  }

  /**
   * Like swipeUp/Down/Left/Right but lets you control where the swipe starts.
   * Use when the start position matters — notification shade (startY: 0, center X),
   * Control Center (startY: 0, right X), edge back-swipe (startX: 0, center Y).
   * The driver computes the end point from direction + distance; you don't set x2/y2.
   * For exact end coordinates or speed control use `gesture` instead.
   */
  async swipeFromPoint(
    direction: SwipeDirection,
    options: { startX: number; startY: number; distance?: number },
  ): Promise<void> {
    await this.root.swipe(direction, options);
  }

  async openNotifications(screenSize: { width: number; height: number }): Promise<void> {
    const startX = Math.round(screenSize.width * 0.9);
    const distance = Math.round(screenSize.height * 0.9);
    await this.swipeFromPoint('down', { startX, startY: 0, distance });
  }

  async closeNotifications(screenSize: { width: number; height: number }): Promise<void> {
    const startX = Math.round(screenSize.width * 0.9);
    const startY = Math.round(screenSize.height * 0.9);
    // distance = startY so endY = startY - startY = 0
    await this.swipeFromPoint('up', { startX, startY, distance: startY });
  }

  async tapOnCoordinates(x: number, y: number): Promise<void> {
    await this.root.tap(x, y);
  }

  async pressHardwareButton(button: HardwareButton): Promise<void> {
    await this.root.pressButton(button);
  }

  /**
   * Swipe the screen in a given direction repeatedly until the target
   * element becomes visible, or `maxSwipes` is reached.
   *
   * Why not `scrollIntoView`? mobilewright's `scrollIntoViewIfNeeded`
   * does not navigate every iOS scroll container — UICollectionView /
   * UITableView -backed surfaces (e.g. iOS Contacts edit form) need an
   * explicit gesture to scroll. This is the gesture-based alternative.
   *
   * `minSwipes` forces unconditional swipes before checking visibility.
   * Use when the target reports as visible with placeholder bounds
   * (e.g. iOS Contacts "Delete Contact" StaticText returns
   * `isVisible: true` with `(0, 0)` bounds while off-screen) — a pure
   * visibility-driven loop would short-circuit on the first iteration.
   */
  async swipeUntilVisible(
    locator: Locator,
    options: {
      maxSwipes?: number;
      minSwipes?: number;
      direction?: SwipeDirection;
    } = {},
  ): Promise<void> {
    const { maxSwipes = 8, minSwipes = 0, direction = 'up' } = options;
    // Element may already be in view — short-circuit if no min swipes forced.
    if (minSwipes === 0 && (await this.isVisible(locator))) return;
    for (let i = 0; i < maxSwipes; i++) {
      await this.root.swipe(direction, {});
      if (i + 1 >= minSwipes && (await this.isVisible(locator))) return;
    }
    throw new Error(
      `Element not visible after ${maxSwipes} '${direction}' swipes`,
    );
  }

  /**
   * Raw coordinate-based gesture — the escape hatch when swipe APIs aren't enough.
   * Each sub-array is one finger: a path of { x, y, time? } waypoints where `time`
   * is the ms offset from gesture start. First point = touch down, last = lift off.
   * Use over `swipeFromPoint` when you need: exact end coordinates (e.g. matching a
   * CLI swipe command), a mid-swipe pause/dwell (app switcher), or a second finger
   * (pinch/zoom — pass a second sub-array).
   *
   * Notification swipe equivalent of CLI `io swipe 540,0,540,1500`:
   *   gesture([[{ x: 540, y: 0 }, { x: 540, y: 1500, time: 500 }]])
   */
  async gesture(pointers: GesturePointers): Promise<void> {
    await this.root.gesture({ pointers });
  }

  // ─── WebView access ─────────────────────────────────────────────────
  // Returns a WebViewLocator — call .page() on the result to get a
  // Playwright Page for driving embedded web content. Use opts.testId to
  // target a specific web view when more than one is present on screen.

  getByWebView(opts?: GetByWebViewOptions): WebViewLocator {
    return this.root.getByWebView(opts);
  }

}

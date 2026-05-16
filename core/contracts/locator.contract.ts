export type WaitState = 'visible' | 'hidden' | 'enabled' | 'disabled';

export interface LocatorLike {
  // Actions
  tap(): Promise<void>;
  fill(text: string): Promise<void>;
  scrollIntoViewIfNeeded(): Promise<void>;

  // Queries
  isVisible(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  isSelected(): Promise<boolean>;
  isFocused(): Promise<boolean>;
  isChecked(): Promise<boolean>;
  getText(): Promise<string>;
  getValue(): Promise<string>;

  // Waits
  waitFor(options: { state: WaitState; timeout?: number }): Promise<void>;

  // Collection (returns the same concrete locator type via polymorphic `this`)
  first(): this;
  last(): this;
  nth(index: number): this;
  count(): Promise<number>;
  all(): Promise<this[]>;
}

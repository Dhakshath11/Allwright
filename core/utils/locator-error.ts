export class LocatorActionError extends Error {
  readonly action: string;
  readonly locatorDescription: string;
  override readonly cause: unknown;

  constructor(action: string, locatorDescription: string, cause: unknown) {
    super(`${action}() failed — locator: ${locatorDescription}`);
    this.name = 'LocatorActionError';
    this.action = action;
    this.locatorDescription = locatorDescription;
    this.cause = cause;
  }
}

import type { APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Assert that a response has the expected HTTP status code.
 * Includes the URL and actual status in the failure message so the report
 * immediately shows what went wrong without digging into network logs.
 */
export function assertStatus(response: APIResponse, expected: number): void {
  expect(
    response.status(),
    `Expected HTTP ${expected} but got ${response.status()} — ${response.url()}`,
  ).toBe(expected);
}

/**
 * Assert that response.ok() is true (status 200-299).
 * Use when the exact code doesn't matter, only success vs. failure.
 */
export function assertOk(response: APIResponse): void {
  expect(
    response.ok(),
    `Response not OK: HTTP ${response.status()} — ${response.url()}`,
  ).toBe(true);
}

/**
 * Parse and cast response body to T.
 * TypeScript types are compile-time only — pair with schema validation
 * (apps/api/schemas/) when the shape must be verified at runtime.
 */
export async function json<T>(response: APIResponse): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return response.json();
}

/**
 * Assert that the response body contains every key-value pair in `subset`.
 * Useful for partial matching without spelling out every field.
 */
export async function assertBodyContains(
  response: APIResponse,
  subset: Record<string, unknown>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await response.json();
  for (const [key, value] of Object.entries(subset)) {
    expect(
      (body as Record<string, unknown>)[key],
      `Expected body.${key} to equal ${JSON.stringify(value)}`,
    ).toEqual(value);
  }
}

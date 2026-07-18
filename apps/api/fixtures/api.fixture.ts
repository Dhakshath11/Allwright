import { test as base } from '@playwright/test';

// All API specs import { test, expect } from this module — never directly
// from @playwright/test. That gives us one place to inject client fixtures
// as APIs are onboarded:
//
//   import { UserApiClient } from '../clients/user-api.client';
//
//   export const test = base.extend<{ userClient: UserApiClient }>({
//     userClient: async ({ request }, use) => await use(new UserApiClient(request)),
//   });
//
// Once extended, tests receive the client via fixture destructuring:
//   test('...', async ({ userClient }) => { ... });
//
// The `request` fixture (Playwright's built-in APIRequestContext) is always
// available too — use it for one-off requests that don't warrant a full client.

export const test = base;
export { expect } from '@playwright/test';

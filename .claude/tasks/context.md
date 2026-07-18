# Session Context

Last-updated: 2026-07-09

## Focus area

API surface scaffold — Playwright APIRequestContext, layered client/fixture/utils architecture, no CoreUtils.

## What we built this session

### API surface at `apps/api/` (sibling to apps/web/, NOT a CoreUtils extension)

```
apps/api/
├── playwright.config.ts        single 'api' project, testMatch: /_api\.spec\.ts$/
│                               baseURL: env API_BASE_URL (default: https://reqres.in)
├── fixtures/
│   └── api.fixture.ts          re-exports Playwright test + expect; extend here to add service clients
├── clients/
│   └── base-api.client.ts      BaseApiClient — protected get/post/put/patch/delete
├── models/
│   ├── request/index.ts        placeholder — add UserRequest, LoginRequest, etc.
│   └── response/index.ts       placeholder — add UserResponse, LoginResponse, etc.
├── utils/
│   └── api.utils.ts            assertStatus / assertOk / json<T> / assertBodyContains (module functions)
└── sample/
    └── tests/
        └── sample_api.spec.ts  3-test sample against reqres.in (GET list, GET single, POST create)
```

**Key design decisions:**

- No `CoreUtils` inheritance — API has no locator tree; `BaseApiClient` is a standalone class.
- No snapshots — API surface has no view tree; not applicable.
- `fixtures/api.fixture.ts` is the single import point for all API specs (not `@playwright/test` directly).
  Add service clients via `base.extend<{ clientName: ClientClass }>({ ... })` as APIs are onboarded.
- `utils/api.utils.ts` exposes module-level functions (not class methods) so call-site stack frames
  stay in the test file in Playwright's HTML report. `assertStatus` includes URL + actual status in
  the failure message — justified because it adds meaningful diagnostics, not a pure 1:1 passthrough.
- Test file naming: `<service>_api.spec.ts` → picked up by `testMatch: /_api\.spec\.ts$/`.
- `models/request/` and `models/response/` use interfaces (not classes) — Playwright serialises plain
  objects automatically; no Jackson-style deserialisation needed in TypeScript.
- Future additions per the user's plan: service-specific clients in `clients/`, builders in `builders/`,
  JSON schemas in `schemas/`, static test data in `data/`. User will supply actual API targets.

**package.json scripts updated:**
- `test:api` → `playwright test --config apps/api/playwright.config.ts`

## Open threads

- Firefox and WebKit spec files for web surface not yet created
- Unit tests for `core/utils/` still deferred
- `gesture()` bug — known mobile issue, avoid until resolved upstream
- API service clients, builders, schemas, data — user will supply API targets and share them

## Next intended step

User will share their target API spec → create service-specific client(s), request/response interfaces,
builders if needed, and replace `sample_api.spec.ts` with real test suites.

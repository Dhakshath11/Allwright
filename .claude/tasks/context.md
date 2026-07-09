# Session Context

Last-updated: 2026-07-09

## Focus area

Web surface scaffold — Playwright + WebUtils + TodoMVC sample tests + snapshot tooling.

## What we built this session

### Web surface at `apps/web/` (mirrors apps/mobile/ structure)

```
apps/web/
├── playwright.config.ts        regression suite → testDir: ./sample/tests
├── snapshots.config.ts         locator-discovery → testDir: ./sample/snapshots
├── utils/
│   └── web.utils.ts            WebLocator + WebUtils (single file, like mobile.utils.ts)
└── sample/
    ├── resources/
    │   └── snapshots/          chromium_<state>.yaml + .png (captured a11y trees)
    ├── screens/
    │   └── todo-list.screen.ts TodoListScreen POM (TodoMVC)
    ├── tests/
    │   └── web_chromium.spec.ts 4 passing tests (add/complete/delete/filter)
    └── snapshots/
        └── _snapshots_chromium.spec.ts  4 passing dump tests
```

**Key design decisions:**

- `web.utils.ts` contains two classes: `WebLocator` (exported, implements `LocatorLike`) and `WebPage` (unexported, implements `LocatorRoot<WebLocator>`). No separate adapter files. Pattern mirrors mobile.utils.ts.
- `WebUtils extends CoreUtils<WebLocator, WebPage>`. Constructor takes Playwright `Page` directly.
- `AriaRole` is NOT a named export from `@playwright/test` 1.58 — inferred via `Parameters<Page['getByRole']>[0]` (same pattern as mobile's `HardwareButton`/`SwipeDirection`).
- No `aria.types.ts` for web — Playwright's own type covers all WAI-ARIA roles.
- `page.accessibility.snapshot()` was removed from Playwright types — use `locator.ariaSnapshot()` → YAML string (Playwright 1.47+). Snapshot files are `.yaml` not `.json` (mobile is `.json`).
- Snapshot tests each navigate independently (fresh Playwright page per test, unlike mobile where the app persists across serial tests).
- Screen object assertions: `expect(this.field.locator).toBeVisible()` — `.locator` gives the raw Playwright Locator needed by Playwright's `expect()`.
- `screens/` has no browser subfolders (web HTML is browser-agnostic; mobile needs `ios/` and `android/` because view trees differ).

**package.json scripts:**
- `test:web` → `playwright test --config apps/web/playwright.config.ts`
- `test:web:snapshots` → `playwright test --config apps/web/snapshots.config.ts`

## Open threads

- Firefox and WebKit spec files (`web_firefox.spec.ts`, `web_webkit.spec.ts`) not yet created
- Unit tests for `core/utils/` still deferred
- `gesture()` bug — known mobile issue, avoid until resolved upstream
- API surface — not started

## Next intended step

Web: add `web_firefox.spec.ts` and `web_webkit.spec.ts` (same 4 tests, different browser project). Then unit test session for `core/utils/`.

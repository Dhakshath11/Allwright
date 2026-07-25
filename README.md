# Allwright

> Unified test automation framework — one API for **Web**, **Mobile**, and **API** testing.

Allwright integrates **Playwright** (web), **Mobilewright** (mobile), and a planned REST client (API) behind a single facade so test authors learn one vocabulary regardless of the surface under test. The long-term goal is a **prompt-driven QA product** where manual testers describe tests in plain English and an LLM composes runnable code against Allwright's primitives.

**Status:** early-stage development. Mobile surface is scaffolded and runs the iOS Contacts app as a smoke test. Web surface is scaffolded and runs TodoMVC as a smoke test. API surface is scaffolded with both direct `request`-based tests and `BaseApiClient`-driven client tests.

---

## Quick start

```bash
# Install
npm install

# Boot the iOS simulator (one-off)
/xcode:setup    # via Claude Code, or run the commands in .claude/commands/xcode/setup.md manually

# Run the mobile suite
npm run test:mobile
```

Expected output:
```
Running 1 test using 1 worker
  1 passed (~18s)
```

The smoke test launches the iOS **Contacts** app, taps **Add**, fills a sample contact (`Dhaksh Test @ LambdaTest`), saves, and asserts the new entry on the detail screen.

## Run commands

| Command | What it does |
|---|---|
| `npm run test:mobile` | Regression suite under `apps/mobile/sample/tests/` |
| `npm run test:mobile:snapshots` | Locator-discovery captures under `apps/mobile/sample/snapshots/`. Pass `-- --project=<ios\|android>` to scope. |
| `npm run test:web`    | Playwright regression suite under `apps/web/sample/tests/`. Runs 3 browser projects (chromium/firefox/webkit). |
| `npm run test:web:snapshots` | Accessibility-tree captures under `apps/web/sample/snapshots/`. Pass `-- --project=<chromium\|firefox\|webkit>` to scope. |
| `npm run test:api`    | Playwright API suite under `apps/api/sample/tests/` (matches `*_api.spec.ts`). |
| `npm run test:api:sample` | Runs direct `request`-fixture sample spec (`sample_api.spec.ts`). |
| `npm run test:api:client` | Runs client-fixture sample spec (`users_client_api.spec.ts`) that uses `UserApiClient` extending `BaseApiClient`. |
| `npm test`            | Alias for `test:mobile` (only working surface today) |
| `npm run lint`        | ESLint over the repo (type-aware via `typescript-eslint/recommended-type-checked`) |
| `npm run lint:fix`    | ESLint with `--fix` |

## CI

`.github/workflows/ci.yaml` runs on push to `main`, on every PR, and via `workflow_dispatch`:

- **`lint`** job — `npm run lint`
- **`security-scan`** job — `npm audit --audit-level=high` (CodeQL is wired but commented out until Code Scanning is enabled in repo Settings → Code security → Code scanning → Advanced)

Both jobs use the `package-lock.json` for reproducible `npm ci` installs.

## Platform target (mobile)

`apps/mobile/mobilewright.config.ts` defines a **two-project matrix** — iOS and Android run as separate mobilewright projects, each constrained to its own specs via `testMatch`:

```ts
projects: [
  { name: 'ios',     testMatch: /_ios\.spec\.ts$/,     use: { platform: 'ios',     bundleId: 'com.apple.MobileAddressBook', deviceName: /iPhone 17 Pro/ } },
  { name: 'android', testMatch: /_android\.spec\.ts$/, use: { platform: 'android', bundleId: 'com.google.android.contacts', deviceName: /Pixel 10 Pro/ } },
],
```

- **Filename convention is the contract.** Specs must end with `_ios.spec.ts` or `_android.spec.ts` — that's how each project picks them up. Without `testMatch`, every project would run every spec (spec count × project count).
- **iOS** runs against `com.apple.MobileAddressBook` on an iPhone 17 Pro simulator.
- **Android** runs against `com.google.android.contacts` on a Pixel 10 Pro Google API emulator (Android 13+). On launch, `apps/mobile/global-setup.ts` walks `config.projects` and runs `adb pm grant` for the dangerous runtime permissions (POST_NOTIFICATIONS, READ_CONTACTS, …) for each Android project's `bundleId`, so OS popups never appear. The setup tolerates `"no devices/emulators found"` errors when running iOS-only.
- **Serial state chains** (e.g. add → edit → delete) live behind `test.describe.configure({ mode: 'serial' })` at the top of each `mobile_<platform>.spec.ts`. `fullyParallel: true` stays at the config level for cross-file parallelism.
- **Parallel-execution caveat:** with `workers: 2`, both emulators must be up if you want both projects running simultaneously. Single-emulator runs should pass `--project=<name>` to scope.

## Platform target (web)

`apps/web/playwright.config.ts` defines a **three-project matrix** — chromium, firefox, and webkit run as separate Playwright projects, each constrained to its own specs via `testMatch`:

```ts
projects: [
  { name: 'chromium', testMatch: /_chromium\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox',  testMatch: /_firefox\.spec\.ts$/,  use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit',   testMatch: /_webkit\.spec\.ts$/,   use: { ...devices['Desktop Safari'] } },
],
```

- **Filename convention is the contract.** Specs must end with `_chromium.spec.ts`, `_firefox.spec.ts`, or `_webkit.spec.ts` — same load-bearing pattern as mobile.
- **Target app is TodoMVC** at `https://demo.playwright.dev/todomvc/#/`. baseURL is `https://demo.playwright.dev`.
- **Serial state chain** (add / complete / delete / filter) lives behind `test.describe.configure({ mode: 'serial' })` in `web_chromium.spec.ts`.
- **`screens/` has no browser subfolders.** HTML renders identically across all three browsers, so a single `TodoListScreen` class serves every project. Mobile requires `ios/` and `android/` subdirectories because native view trees diverge between platforms; HTML does not have this problem.
- **`.locator` accessor pattern.** Screen fields are typed as `WebLocator`. Playwright's `expect()` requires a raw Playwright `Locator`, not the wrapper — so assertions are `expect(this.field.locator).toBeVisible()`. Passing `this.field` directly to `expect()` is a type error.
- **Fresh page per test.** Playwright creates a new `Page` for every test automatically. Snapshot tests each call `page.goto()` independently — there is no persistent app state between tests (unlike mobile serial mode, which relies on state accumulated across tests).
- **Web snapshots are `.yaml` + `.png`**, produced by `locator.ariaSnapshot()`. These are the accessibility trees, not JSON view dumps.

## Architecture in one paragraph

`core/` holds surface-agnostic contracts (`LocatorRoot`, `LocatorLike`) and a generic `CoreUtils<L, R>` facade — **no mobilewright/playwright imports**. Each surface lives under `apps/<surface>/` and provides a concrete subclass that adds surface-only primitives. Today `MobileUtils extends CoreUtils<Locator, Screen>` and `WebUtils extends CoreUtils<WebLocator, WebPage>` — `WebLocator` is a thin adapter that bridges Playwright's `Locator` to the `LocatorLike` contract. Test authors only ever import the surface util — the `core/` layer stays invisible. Full architectural rationale lives in [`CLAUDE.md`](./CLAUDE.md).

## API wiring (request fixture vs client fixture)

The API surface supports two valid testing styles side by side:

1. **Direct request style** (existing sample):
   - File: `apps/api/sample/tests/sample_api.spec.ts`
   - Test callback destructures `{ request }`
   - Calls `request.get(...)` / `request.post(...)` directly.

2. **Client style built on `BaseApiClient`** (new sample):
   - File: `apps/api/sample/tests/users_client_api.spec.ts`
   - Test callback destructures `{ userClient }`
   - Calls `userClient.listUsers()` / `userClient.getUserById()` / `userClient.createUser(...)`.

How the wiring works:

- `apps/api/fixtures/api.fixture.ts` extends Playwright's base `test` and registers `userClient`:
  - `userClient: async ({ request }, use) => { await use(new UserApiClient(request)); }`
- Playwright injects built-in `request` (`APIRequestContext`) into the fixture factory.
- The fixture factory constructs `new UserApiClient(request)`.
- `UserApiClient` extends `BaseApiClient`, so it inherits protected HTTP helpers (`get/post/put/patch/delete`).
- `BaseApiClient` stores the same `request` instance in its constructor:
  - `constructor(protected readonly request: APIRequestContext) {}`
- Because fixture extension is additive, built-in `request` remains available; existing tests are not broken.

Minimal flow:

```ts
test('client style', async ({ userClient }) => {
  const res = await userClient.listUsers();
});
```

```ts
test('request style', async ({ request }) => {
  const res = await request.get('/users');
});
```

`MobileUtils` swipe API (all screen-level swipes use `device.io.swipe` which has no `duration` support — omitted by design):

| Method | When to use |
|---|---|
| `swipeUp/Down/Left/Right(distance?)` | Simple directional swipe from screen center |
| `swipeFromPoint(direction, { startX, startY, distance? })` | Start position matters — notification shade, Control Center, edge back-swipe |
| `openNotifications(screenSize)` | Pull notification shade: 90% of width from top, 90% of height distance |
| `closeNotifications(screenSize)` | Dismiss notification shade: reverse of open |
| `swipeElement(locator, direction)` | Swipe anchored to a specific element's center |
| `swipeUntilVisible(locator, opts)` | Loop-swipe until element visible; `minSwipes` forces unconditional swipes for elements with lying iOS bounds |
| `gesture(pointers)` | Raw waypoint-based gesture — exact coords, multi-finger, dwell (note: has a known bug; avoid until resolved) |

## Repository layout

```
core/                          # surface-agnostic facade + contracts
apps/<surface>/                # per-surface util classes, configs, sample tests
  ├── utils/                   # <surface>.utils.ts extending CoreUtils
  └── sample/
      ├── screens/             # POM classes — one per visible screen state
      └── tests/               # spec files
.claude/                       # Claude Code config (skills, commands, tasks)
```

Mobile surface today:
- iOS — 4 screens in `apps/mobile/sample/screens/ios/` driven by `mobile_ios.spec.ts` (add / edit / delete contact + long-press HOME + notification center open/dismiss + two fixme placeholders for app-switcher gestures and Add-Photo screen recording).
- Android — 4 screens in `apps/mobile/sample/screens/android/` driven by `mobile_android.spec.ts` (add / edit / delete contact + long-press HOME + notification shade open/dismiss). Notable Android-vs-iOS divergences captured in the POMs: Delete lives on the *detail* screen (not edit form); no `tapAddPhone` step (phone EditText is always rendered with `"+1"` prefix); header strings are `"Create contact"` / `"Edit contact"`. `MobileUtils` has no `clear()` — mobilewright lacks the primitive — so edit tests assume a clean pre-state (serial mode handles this).
- **Device API smoke tests** — `mobile_device_ios.spec.ts` and `mobile_device_android.spec.ts` exercise every public method on the `device` fixture (`screenSize`, `getOrientation`/`setOrientation`, `launchApp`, `getForegroundApp`, `terminateApp`, `listApps`, `openUrl`/`goto`, `startRecording`/`stopRecording`). These are framework-level checks with no POM dependency. The iOS and Android variants are not interchangeable — they use platform-specific bundle IDs and account for platform behavioural differences (e.g. Springboard vs. home launcher after `terminateApp`).

Web surface today:
- `apps/web/playwright.config.ts` defines a **three-project matrix** — chromium, firefox, and webkit each constrained to their own specs via `testMatch: /_<browser>\.spec\.ts$/`. Filename convention is the contract, same as mobile.
- Target app is **TodoMVC** at `https://demo.playwright.dev/todomvc/#/`. The baseURL is `https://demo.playwright.dev` and specs navigate to the `#/todomvc` path.
- `web_chromium.spec.ts` contains 4 serial tests (add todo / complete todo / delete todo / filter active). Additional browser specs follow the `web_<browser>.spec.ts` naming convention.
- `screens/` has **no browser subfolders** — HTML renders identically across chromium/firefox/webkit, so a single `TodoListScreen` class in `apps/web/sample/screens/` serves all three projects. This differs from mobile, where iOS and Android view trees diverge and require separate POM directories.
- Screen assertions use `expect(this.field.locator).toBeVisible()` — the `.locator` getter on `WebLocator` surfaces the raw Playwright `Locator` that Playwright's `expect()` needs. Passing the `WebLocator` wrapper itself to `expect()` is a type error.
- No `global-setup.ts` — no device permissions to grant in a browser context.
- Snapshots are `.yaml` (from `locator.ariaSnapshot()`) + `.png`, not `.json`. Each snapshot test calls `page.goto()` independently because Playwright provides a fresh `Page` per test.

## Adding a new screen object (POM)

Strict POM: one visible screen state = one class.

**Mobile:** to extract locators from a live app:

1. Add a `test()` block to the platform's snapshot spec in `apps/mobile/sample/snapshots/` (`_snapshots_ios.spec.ts` or `_snapshots_android.spec.ts`) that navigates to your target state.
2. `npm run test:mobile:snapshots -- --project=<platform>` — writes one JSON file per test to `apps/mobile/sample/resources/snapshots/<platform>_<state>.json`. Snapshot specs live in `sample/snapshots/` and are discovered only by `snapshots.config.ts`; the regression suite (`mobilewright.config.ts`) points `testDir` at `sample/tests/`, so the two never overlap.
3. Open the relevant snapshot file (e.g. `android_contacts_list_view.json`), follow the recipe in `.claude/skills/screen-builder/SKILL.md`.
4. Reference shape: any file in `apps/mobile/sample/screens/ios/`.
5. **Never delete the snapshot JSON.** Snapshot files in `resources/snapshots/` are a permanent record. When the UI changes, recapture (overwrite) the file — the timestamp change is logged in `snapshot_history.json`. This history feeds the Auto-Healer strategy (see [Agentic QA Approach](#agentic-qa-approach)).

**Web:** to extract locators from a page state:

1. Navigate to the target page state in a browser and note the URL/path.
2. Add a `test()` block to `apps/web/sample/snapshots/_snapshots_chromium.spec.ts` that calls `page.goto(url)` and then `locator.ariaSnapshot()` for the relevant region.
3. `npm run test:web:snapshots -- --project=chromium` — writes one `.yaml` + `.png` per test to `apps/web/sample/resources/snapshots/`. The YAML accessibility tree lists all roles, names, and testIds visible on the page.
4. Read the YAML, pick locators using the priority table (`getByTestId` > `getByLabel` > `getByRole(role, name)` > `getByPlaceholder` > `getByText`), and build the screen class using `WebUtils` and `WebLocator` fields.
5. Reference shape: `apps/web/sample/screens/todo-list.screen.ts`. **Never delete the snapshot YAML/PNG** — same permanent-record rule as mobile.

## Conventions

- **TypeScript** with strict typing across the framework.
- **Dot-descriptor filenames**: `<name>.<role>.ts` (e.g. `contacts-list.screen.ts`, `mobile.utils.ts`, `locator.contract.ts`).
- **Named-object params** on every action method — never positional. The LLM/manual QA must be able to call APIs from a plain-English prompt without remembering argument order.
- **Locator selector priority**: `getByTestId` > `getByLabel` > `getByRole(role, name)` > `getByPlaceholder` > `getByText` (brittle, last resort).
- **One screen state per class.** A list view and a form are separate screens, separate classes.
- **Action methods encapsulate the full user flow.** Don't leak intermediate taps to the test layer.
- **Every public screen action wraps its body in `test.step(...)`** — mandatory, no exceptions. See [Screen action methods MUST use `test.step`](#screen-action-methods-must-use-teststep).
- **Utilities in `core/utils/` ship with unit tests** — non-negotiable. Untested helpers in a testing framework would undermine the product.

## Screen action methods MUST use `test.step`

Every public method on a screen object — actions (`tapAdd`, `fillBasics`, ...) and assertions (`expectAtListScreen`, `expectMobileNumber`, ...) — wraps its body in `test.step(name, async () => { ... })`. **This is non-negotiable** and applies to every screen across every surface (mobile, web, API when it lands).

```ts
import { test } from '@mobilewright/test';   // or '@playwright/test' on web

async tapAdd(): Promise<void> {
  await test.step('Tap Add button', async () => {
    await this.utils.tap(this.addButton);
  });
}

async expectAtListScreen(): Promise<void> {
  await test.step('Expect at Contacts list screen', async () => {
    await this.utils.expectVisible(this.title);
  });
}
```

**Why it's mandatory:**

1. **Failure reports point at the screen action, not the framework.** Without a step, a failed `tap` surfaces at `core/utils/core.utils.ts:46` — useless to a QA reading a CI failure. With a step, the report points at the screen method and the test line.
2. **The HTML report and trace viewer become a readable script.** Each step is a clickable node with screenshot, network, and console scoped to it. A non-engineer can debug a failure without opening source code.
3. **It's the only convention that survives the prompt-driven QA end goal.** When an LLM generates tests, the manual QA reads the report — not the code. Step names *are* the documentation.
4. **It composes.** A spec can wrap a multi-screen flow in its own `test.step(...)` and the screens' steps nest underneath. The trace becomes a tree of intent.

**Step naming rules:**
- Imperative mood, title case: `'Tap Add button'`, not `'Tapping the add button'`.
- One step per public method body; no nested `test.step` inside a screen method.
- Interpolate dynamic args into the name: `` `Search for "${query}"` ``, `` `Fill mobile number "${value}"` ``.
- Don't prefix with the screen name — the trace tree already shows hierarchy.

**What stays free of `test.step`:**
- `CoreUtils` / `MobileUtils` / `WebUtils` methods (low-level primitives — they'd clutter the trace).
- Private helpers inside screens.
- Constructors and locator initialization.

`allwright-reviewer` flags any public screen method missing `test.step` as `[Critical]`.

## Roadmap

**Planned:**
- Web surface (Playwright)
- API surface (REST client + JSON-schema validation)
- GitHub Actions CI
- Unified reporting across surfaces

**Aspirational:**
- AI-generated tests from plain-English prompts (the strategic end goal)
- Self-healing locators
- JIRA / Slack / Email integrations
- LambdaTest cloud grid + real-device farm integration

## Working with Claude Code in this repo

`CLAUDE.md` is the operating manual for Claude when working in this codebase — it documents conventions, the facade architecture, and the project's skills/commands. Relevant entry points:

- `/xcode:setup` — boot the iOS simulator and confirm Xcode tooling.
- `/mobile:test` — run the mobile suite.
- **`screen-builder`** skill — recipe for building POM classes from a captured view tree.
- **`allwright-reviewer`** skill — pre-PR review tuned to Allwright's conventions.
- **`mobilewright-cli`** skill — agentic end-to-end workflow: preflight → capture → inspect → build POM → write test → run.

---

## Agentic QA Approach

The sections below describe the agentic layer being built on top of Allwright's test surfaces. Each is a stub — content will be filled in as the pieces are implemented.

### Skills

> *TODO: document each Claude Code skill, its trigger phrases, what it does, and when to use it vs. the manual equivalent.*

Current skills in `.claude/skills/`:

| Skill | Mode | Purpose |
|---|---|---|
| `mobilewright-cli` | Agentic | Full workflow — preflight, capture, build POM, write and run tests |
| `screen-builder` | Manual (token-light) | Build a single POM from an already-captured snapshot |
| `allwright-reviewer` | Agentic | Pre-PR review against Allwright conventions |

### Workflow

> *TODO: diagram the end-to-end agentic QA workflow — from a plain-English test intent to a running spec. Cover how skills chain together (mobilewright-cli → screen-builder → allwright-reviewer) and where human checkpoints sit.*

### MCP

> *TODO: document MCP server integrations planned for Allwright — e.g. JIRA for bug sync, Slack for run notifications, LambdaTest for cloud grid access. Include server name, what tools it exposes, and how to configure it in `.claude/settings.json`.*

### Agent

> *TODO: describe the autonomous QA agent design — how it takes a natural-language test description, uses the skills above, and produces a committed, reviewed spec. Cover the agent loop, handoff points, and how it ties into the prompt-driven QA end goal.*

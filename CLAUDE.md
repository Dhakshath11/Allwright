# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Allwright is in **early-stage development**. Mobile surface (`apps/mobile/`) is scaffolded with mobilewright running against the iOS Contacts app as a smoke test. Web surface is scaffolded with Playwright running against TodoMVC. API surface is not yet started. The sections below describe both the **current** layout and the **intended** end state.

When the user asks you to scaffold something, prefer adding the minimum that satisfies the request over generating the full proposed tree.

## What Allwright Is

Allwright is a unified Test Automation Framework that integrates **Playwright** (web) and **Mobilewright** (mobile) to cover three test surfaces from a single codebase:

- 🌐 **Browser** — cross-browser UI / E2E
- 📱 **Mobile** — Android/iOS, native + hybrid
- 🔌 **API** — REST contract, auth, schema validation

The framework's purpose is to replace fragmented per-surface automation stacks with one shared architecture for runtime, fixtures, reporting, and CI.

## Intended Stack

- **Node.js / TypeScript** — framework runtime
- **Playwright** — browser automation
- **Mobilewright** — mobile automation
- **REST clients** — API validation
- **GitHub Actions** — CI/CD pipelines (planned)
- **Unified reporting layer** — single report across web/mobile/API runs

## Proposed Architecture

The user has proposed this layout. It is a target, not a contract — confirm before deviating, but do not treat missing directories as bugs to fix proactively:

```
Allwright/
├── apps/
│   ├── web/         # Playwright suites
│   ├── mobile/      # Mobilewright suites
│   └── api/         # REST suites
├── core/
│   ├── config/      # shared config (envs, capabilities, base URLs)
│   ├── utils/       # cross-surface helpers
│   ├── reporters/   # unified reporting
│   └── integrations/# CI, dashboards, external services
├── test-data/
├── fixtures/
├── pipelines/       # GitHub Actions workflows
└── docs/
```

Key architectural intent: `core/` is shared across `apps/web|mobile|api`. When adding utilities, ask whether the code belongs to a single surface (→ `apps/<surface>/`) or is reusable (→ `core/`). Avoid leaking Playwright-specific or Mobilewright-specific types into `core/`.

## End Goal — Prompt-Driven QA

The long-term vision is to **package and release Allwright as a product** that a **manual QA tester can drive entirely through natural-language prompts** — without writing TypeScript. The framework should expose a stable, prompt-friendly surface (clear test primitives, predictable selectors, well-named fixtures) so an LLM can compose runnable tests from plain-English intent.

Design decisions today should be evaluated against this goal: APIs that are hard to describe in a prompt are red flags. Favor declarative, composable building blocks over clever abstractions.

## Future Scope (Not Yet Built)

Aspirational — do not implement unless explicitly requested:

- **Integrations:** JIRA (bug/ticket sync), Slack (run notifications), Email (report delivery)
- AI-powered test generation (ties into prompt-driven QA goal above)
- Self-healing locators
- Defect prediction
- Flaky test detection
- Distributed cloud execution (likely via LambdaTest grid)
- Real device farm integration (likely LambdaTest)
- Observability dashboards

## Testing the Framework Itself

Utility methods under `core/utils/` (and anywhere else in `core/`) **must have unit tests**. Allwright is itself a testing framework — shipping untested helpers to manual QAs would undermine the product. Runner is **Vitest** (`vitest.config.ts` scoped to `core/**/*.test.ts`, `npm run test:unit`). End-to-end suites under `apps/` exercise real targets and are not a substitute for unit tests on the helpers they depend on.

## Working in This Repo Today

### Current Layout

```
Allwright/
├── core/                              # surface-agnostic — no mobilewright/playwright imports
│   ├── contracts/
│   │   ├── locator.contract.ts        # LocatorLike, WaitState
│   │   └── root.contract.ts           # LocatorRoot (no AriaRole — that's per-surface)
│   └── utils/
│       └── core.utils.ts              # CoreUtils<L, R> — generic facade (no getByRole)
├── apps/
│   ├── mobile/
│   │   ├── mobilewright.config.ts             # regression suite — testDir: ./sample/tests
│   │   ├── snapshots.config.ts                # locator-discovery — testDir: ./sample/snapshots
│   │   ├── global-setup.ts                    # walks projects[] and adb-grants Android perms
│   │   ├── utils/
│   │   │   ├── aria.types.ts                  # MobileAriaRole union (mirrors ROLE_TYPE_MAP)
│   │   │   └── mobile.utils.ts                # MobileUtils extends CoreUtils
│   │   └── sample/
│   │       ├── resources/
│   │       │   ├── snapshots/                 # one <platform>_<state>.json per dumped screen (permanent — never delete)
│   │       │   └── snapshot_history.json      # change log per snapshot file — feeds Auto-Healer strategy
│   │       ├── screens/
│   │       │   ├── ios/                       # iOS Contacts POMs (4 screens)
│   │       │   └── android/                   # Android Contacts POMs (4 screens)
│   │       ├── tests/                         # REGRESSION SUITE — discovered by mobilewright.config.ts
│   │       │   ├── mobile_ios.spec.ts         # iOS suite (serial, add/edit/delete + 2 fixme)
│   │       │   └── mobile_android.spec.ts     # Android suite (serial, add/edit/delete)
│   │       └── snapshots/                     # LOCATOR-DISCOVERY TOOLING — discovered by snapshots.config.ts
│   │           ├── _snapshots_ios.spec.ts     # iOS view-tree captures → resources/snapshots/
│   │           └── _snapshots_android.spec.ts # Android view-tree captures → resources/snapshots/
│   ├── web/
│   │   ├── playwright.config.ts               # 3-project matrix (chromium/firefox/webkit), testMatch: /_<browser>\.spec\.ts$/, baseURL: https://demo.playwright.dev, testDir: ./sample/tests
│   │   ├── snapshots.config.ts                # locator-discovery — testDir: ./sample/snapshots, same 3-project matrix
│   │   ├── utils/
│   │   │   └── web.utils.ts                   # WebLocator (LocatorLike adapter) + WebPage (LocatorRoot bridge) + WebUtils extends CoreUtils
│   │   └── sample/
│   │       ├── resources/
│   │       │   └── snapshots/                 # one <browser>_<state>.yaml + .png per captured screen (permanent — never delete)
│   │       ├── screens/                        # web POMs — no browser subfolders (HTML is browser-agnostic)
│   │       │   └── todo-list.screen.ts        # TodoListScreen (TodoMVC at demo.playwright.dev/todomvc)
│   │       ├── tests/                         # REGRESSION SUITE — discovered by playwright.config.ts
│   │       │   └── web_chromium.spec.ts       # TodoMVC suite (serial, add/complete/delete/filter)
│   │       └── snapshots/                     # LOCATOR-DISCOVERY TOOLING — discovered by snapshots.config.ts
│   │           └── _snapshots_chromium.spec.ts # aria-snapshot captures → resources/snapshots/
│   └── api/
│       ├── playwright.config.ts               # single 'api' project, testMatch: /_api\.spec\.ts$/, baseURL: env API_BASE_URL (default: https://jsonplaceholder.typicode.com)
│       ├── fixtures/
│       │   └── api.fixture.ts                 # re-exports Playwright test + expect; extend here to inject service clients
│       ├── clients/
│       │   └── base-api.client.ts             # BaseApiClient — protected get/post/put/patch/delete wrapping APIRequestContext
│       ├── models/
│       │   ├── request/index.ts               # request interfaces (UserRequest, LoginRequest, …)
│       │   └── response/index.ts              # response interfaces (UserResponse, LoginResponse, …)
│       ├── utils/
│       │   └── api.utils.ts                   # assertStatus / assertOk / json<T> / assertBodyContains
│       └── sample/
│           └── tests/
│               └── sample_api.spec.ts         # 3-test sample against reqres.in (GET list, GET single, POST create)
├── .claude/
│   ├── commands/                      # project slash commands
│   ├── skills/                        # project skills (allwright-reviewer)
│   └── tasks/                         # context.md / lessons.md (created on first use)
├── package.json
├── CLAUDE.md
└── README.md
```

### Utility Architecture (Facade Pattern)

Cross-surface uniformity via a shared `CoreUtils` base class. Manual QAs (eventually via LLM prompts) learn **one** API regardless of surface.

- `core/contracts/` — structural interfaces (`LocatorRoot`, `LocatorLike`, `WaitState`). Type-only; **no runtime imports** from `@mobilewright/*` or `@playwright/*`. Surface-neutral names: the entry point of the locator hierarchy is `LocatorRoot`, not `ScreenLike`/`PageLike` — `core/` deliberately avoids surface vocabulary.
- `core/utils/core.utils.ts` — generic `CoreUtils<L extends LocatorLike, R extends LocatorRoot<L>>` exposing the operations common to every locator-based surface: locator finders (`getByText`, `getByTestId`, `getByPlaceholder`, `getByLabel`), primitive actions (`tap`/`fill`/`scrollIntoView`), queries (`isVisible`/`getText`/etc.), `waitFor`, collection (`first`/`last`/`nth`/`count`/`all`), `screenshot`. The protected field is `this.root` (not `this.screen`). **`getByRole` is deliberately NOT here** — ARIA role unions differ between mobile and web, so each surface declares its own `getByRole` with its own role type.
- `apps/<surface>/utils/<surface>.utils.ts` — concrete subclass. Two exist today:
  - `apps/mobile/utils/mobile.utils.ts`: `class MobileUtils extends CoreUtils<Locator, Screen>` declares its own `getByRole(role: AriaRole, name?)` against the mobile-scoped role union (in `apps/mobile/utils/aria.types.ts`), and adds mobile-only primitives (swipe up/down/left/right, longPress, doubleTap, swipeElement, hardware buttons, coordinate tap, iOS `getByType`). The user-facing constructor param is named `screen` so test code reads naturally (`new MobileUtils(screen)`) — internally it's stored as `this.root`.
  - `apps/web/utils/web.utils.ts`: three classes in one file — `WebLocator` (implements `LocatorLike`, wraps Playwright `Locator`, exposes a public `.locator` field for `expect()` calls), an unexported `WebPage` (implements `LocatorRoot<WebLocator>`, bridges Playwright `Page`), and `class WebUtils extends CoreUtils<WebLocator, WebPage>`. There is no separate `aria.types.ts` for web — Playwright exports its own `AriaRole` type, inferred as `Parameters<Page['getByRole']>[0]`. Screen assertions use `expect(this.field.locator)`, not `expect(this.field)`, because `expect()` needs the raw Playwright `Locator`, not the `WebLocator` wrapper.

**Web surface (done):** `apps/web/utils/web.utils.ts` uses a three-class pattern in one file. `WebLocator` is a thin adapter: it implements `LocatorLike` by wrapping a Playwright `Locator` and exposing all required contract methods (`tap()` → `click()`, `getText()` → `innerText()`, `getValue()` → `inputValue()`, `isSelected`/`isFocused` via `evaluate()`). It also exposes a public `.locator` field so screen assertions can call `expect(this.field.locator).toBeVisible()` — Playwright's `expect()` needs the raw `Locator`, not the wrapper. An unexported `WebPage` class implements `LocatorRoot<WebLocator>` and bridges the Playwright `Page`. `WebUtils extends CoreUtils<WebLocator, WebPage>` then adds web-only primitives (click/dblClick/hover/clear/pressKey/selectOption/check/uncheck/dragTo, filter/getByRoleWithin/locatorWithin, goto/reload/goBack/goForward/waitForUrl, pressPageKey/typeText) and declares `getByRole` using Playwright's own role type inferred as `Parameters<Page['getByRole']>[0]`. No separate `aria.types.ts` is needed — Playwright exports its own union, and inferring it from the API keeps the two in sync automatically. No `global-setup.ts` is needed — there are no device permissions to grant. Snapshots are `.yaml` (from `locator.ariaSnapshot()`) + `.png`, not `.json`. Each snapshot test calls `page.goto()` independently because Playwright provides a fresh `Page` per test (unlike mobile where the app persists across serial tests). `screens/` has no browser subfolders — HTML is browser-agnostic, so one screen class serves all three browser projects.

**API surface is a sibling abstraction, not an extension of `CoreUtils`.** REST has no locator tree, so `CoreUtils` does not apply. The API surface uses three layers:
- `clients/base-api.client.ts` — `BaseApiClient` wraps `APIRequestContext` with protected `get/post/put/patch/delete` methods. Service-specific clients (e.g. `UserApiClient`) extend this and expose domain methods. Tests never call `request.get/post` directly — they go through a client.
- `fixtures/api.fixture.ts` — extends Playwright's base `test` to inject client instances as fixtures. The `request` built-in (Playwright's `APIRequestContext`) is always available; additional client fixtures are added here as services are onboarded.
- `utils/api.utils.ts` — module-level helper functions (`assertStatus`, `assertOk`, `json<T>`, `assertBodyContains`). These are NOT class methods and NOT `expect*` wrappers on a utils class — module functions keep call-site stack frames in Playwright's HTML report. The assertion functions add meaningful messages (URL + actual status) that bare `expect(res.status()).toBe(200)` cannot.

No `CoreUtils` inheritance. No `LocatorLike`/`LocatorRoot` contracts. No screen objects or snapshots.

**Don't:** import `@mobilewright/*` or surface-specific types into `core/`. Don't put mobile-only methods (gestures, hardware buttons) into `CoreUtils`. Don't reintroduce "screen"/"page" terminology in `core/` — use `root`.

### File Naming Convention

Dot-descriptor pattern throughout: `<name>.<role>.ts`. The `<name>` part is **kebab-case** if compound.

- Screen objects: `<feature>.screen.ts` or `<feature>-<state>.screen.ts` for multi-state surfaces (e.g. `contacts-list.screen.ts`, `add-contact.screen.ts`)
- Utilities: `<scope>.utils.ts` (e.g. `core.utils.ts`, `mobile.utils.ts`)
- Contracts: `<name>.contract.ts` (e.g. `locator.contract.ts`)
- Specs: `<feature>.spec.ts` (e.g. `example.spec.ts`)
- Type-only modules: `<name>.types.ts` (e.g. `aria.types.ts`)

Avoid `snake_case` and `camelCase` filenames — they exist in the TS ecosystem but conflict with this project's chosen style.

### Screen Object Pattern (strict POM)

**One visible screen state = one class = one file.** Don't combine a list view and a form into one screen object — they're different states with different elements. Example: iOS Contacts has `ContactsListScreen` (list + Add button + Search) and `AddContactScreen` (form fields + Save) as separate classes in `contacts-list.screen.ts` and `add-contact.screen.ts`.

**Every screen object class follows the same shape:**

- Class name `<Feature>Screen` (e.g. `ContactsListScreen`, `AddContactScreen`, `TodoListScreen`) — exported.
- Constructor takes mobilewright `Screen` (mobile) or Playwright `Page` (web), instantiates `MobileUtils` / `WebUtils` internally as `private readonly utils`.
- Locators on mobile: `private readonly <name>: Locator`, initialized in the constructor via `this.utils.getByX(...)`. Locators on web: `private readonly <name>: WebLocator`, same initialization pattern.
- Every declared locator must be consumed by at least one method (TS will catch unused — and it caught a dead `dictateButton` once).
- Action methods: **named-object params**, return `Promise<void>`, encapsulate the **full** flow (not partial steps). Never expose positional args.
- Locator interaction goes through `this.utils.tap / fill / etc.` — never call mobilewright or Playwright APIs directly.
- Assertions on mobile: `expect(locator)` wired via mobilewright's `expect`. Assertions on web: `expect(this.field.locator).toBeVisible()` — the `.locator` getter on `WebLocator` returns the raw Playwright `Locator` that Playwright's `expect()` requires. Do not pass the `WebLocator` wrapper directly to `expect()`.
- Reference shape: `apps/mobile/sample/screens/contacts-list.screen.ts` and `apps/web/sample/screens/todo-list.screen.ts`.

To build a new screen, invoke the `screen-builder` skill (manual mode — token-light).

### Run Commands

| Command | What it does |
|---|---|
| `npm run test:mobile` | Regression suite (mobilewright.config.ts, testDir: `sample/tests`). |
| `npm run test:mobile:snapshots` | Locator-discovery captures (snapshots.config.ts, testDir: `sample/snapshots`). Run with `-- --project=<ios\|android>` to scope. |
| `npm run test:web` | Playwright regression suite (`playwright.config.ts`, testDir: `apps/web/sample/tests`). 3 browser projects (chromium/firefox/webkit). |
| `npm run test:web:snapshots` | Accessibility-tree captures (`apps/web/snapshots.config.ts`, testDir: `apps/web/sample/snapshots`). Pass `-- --project=<chromium\|firefox\|webkit>` to scope. |
| `npm run test:api` | Playwright API suite (`apps/api/playwright.config.ts`, testDir: `apps/api/sample/tests`). Single 'api' project; picks up `*_api.spec.ts` files. Set `API_BASE_URL` env var to override the default base URL (jsonplaceholder.typicode.com). |
| `npm test` | Alias for `test:mobile` (only working surface today). |

The `--config <path>` flag works from any cwd as of mobilewright 0.0.44 (earlier versions had a cwd-dependent loader bug that produced `Unsupported platform: "undefined"`). Relative paths inside the config — `globalSetup: './global-setup.ts'`, `testDir`, etc. — resolve against the config file's directory.

### Misc Notes

- The user works at LambdaTest — relevant if integrations with LambdaTest's cloud grid or device farm come up.
- "Frawright" appears in the user's notes as a likely typo for "Allwright" — treat them as the same project.
- `package-lock.json` is gitignored. Standard practice is to commit it for reproducible installs; revisit before the framework is packaged for release.

## Working Discipline

- **Search `core/` before adding a utility.** Grep for an existing helper first. The prompt-driven QA end goal makes duplicate or near-duplicate utilities especially harmful — an LLM picking from `core/utils` will choose the wrong one and produce flaky generated tests. Reuse > new.
- **Bug fixes.** If the root cause is clear, fix it directly. If it's unclear, **ask before patching** — do not guess or apply speculative fixes. Identify the failing test / log / stack trace and state the root cause before proposing the change.
- **Self-improvement loop.** After a meaningful correction from the user, append the pattern to `.claude/tasks/lessons.md` (mistake → rule → example). Read `.claude/tasks/lessons.md` before starting complex tasks. Without the read step, the file is dead weight.
- **Session context persistence (`.claude/tasks/context.md`).** At the end of any non-trivial session, write/update `.claude/tasks/context.md` with: what we worked on, decisions made, open threads, and the next intended step. At the **start** of a session, read it. This is the repo-committed handoff between sessions — distinct from the local auto-memory at `~/.claude/projects/.../memory/` (which holds cross-session facts and preferences, per-user, not in git). Keep `context.md` short and current: overwrite stale entries, don't append forever.
- **Honest critique over politeness.** If a proposed approach is weak, say so directly and explain why, then offer the better path. Praise only when earned. Soft feedback that hides a real problem is worse than blunt feedback.

## Project Skills (`.claude/skills/`)

| Skill | Trigger phrases | What it does |
|---|---|---|
| **`allwright-reviewer`** (`.claude/skills/allwright-reviewer/SKILL.md`) | "review my PR", "review my branch", "review my changes", "pre-review", "check before commit", "review this file", "code review" | Pre-PR review tuned to Allwright (TypeScript + mobilewright + Playwright + REST). Applies a severity-tagged checklist (`[Critical]` / `[Major]` / `[Minor]` / `[Nit]`) with every comment carrying a concrete `Fix:` recommendation. Specifically catches: screen-object hygiene (locator co-location, typed `readonly` props, named-object params, full-flow encapsulation), locator stability, **prompt-friendliness of public APIs** (the strategic differentiator), cross-surface uniformity (no surface types leaking into `core/`), known mobilewright traps (the `--config` flag bug, first-run timeout), and `core/utils/` unit-test gaps. Outputs a structured report with blocking-issue count and APPROVE / REQUEST_CHANGES verdict. |
| **`screen-builder`** (`.claude/skills/screen-builder/SKILL.md`) | "build a screen", "build the contacts screen", "create a screen for X", "extract locators for X screen", "scaffold X screen", "make the POM for X" | **Manual mode — token-light by design.** Recipe + template + conventions reference for building Allwright screen object classes from a captured mobilewright view tree. The user does the extraction work themselves; Claude is consulted only on demand for ambiguous locator decisions or a final review (via `allwright-reviewer`). Skill provides: the dump-and-extract workflow, a selector priority table (testId > label > role+name > placeholder > text), the full screen-class template, and non-negotiable conventions (facade via `MobileUtils`, typed `readonly` locators, named-object action params, full-flow encapsulation, one screen state per class). |
| **`mobilewright`** (`.claude/skills/mobilewright/SKILL.md`) | **`/mobilewright <bundle-id> [ios\|android] "intent"` only** — never auto-trigger | **Pure agentic orchestrator.** Director agent (phase 0) scans existing assets, optionally uses graphify, maps intent to a mode (write\|execute\|debug\|fix\|maintain\|refactor), assesses token cost, asks ONE question block, then writes a plan. Orchestrator auto-proceeds through planned phases without human confirmation — one autonomous retry on failure, escalates only if recovery also fails. State YAML at `.claude/tasks/mobilewright_state.yaml` survives compaction and session breaks. |

## Project Slash Commands (`.claude/commands/`)

Project-specific commands live in `.claude/commands/`. Files are **grouped by tool/topic** into subfolders — the folder name becomes a `:` namespace prefix on the slash command. Use this to keep the command list scannable as it grows.

| Command | Action |
|---|---|
| `/xcode:setup` | Xcode version → list simulators → boot iPhone 17 Pro Max → `open -a Simulator` |
| `/mobile:test` | `npm run test:mobile -- $ARGUMENTS` |
| `/mobile:snapshot` | `npm run test:mobile:snapshots -- $ARGUMENTS` (pass `--project=ios\|android`) |
| `/web:test` | `npm run test:web -- $ARGUMENTS` |
| `/web:snapshot` | `npm run test:web:snapshots -- $ARGUMENTS` (pass `--project=chromium\|firefox\|webkit`) |
| `/device:list` | `mobilewright devices` — all simulators/emulators and their state |
| `/device:boot` | `xcrun simctl boot "$ARGUMENTS" && open -a Simulator` |
| `/debug:doctor` | `mobilewright doctor $ARGUMENTS` — env health check (`--category ios\|android\|system`) |
| `/debug:dump` | `mobilecli dump ui` on booted device → `/tmp/mw_uidump.json` |
| `/debug:screenshot` | `mobilecli screenshot` on booted device → `/tmp/mw_screen.png` |
| `/debug:agent` | Force reinstall WDA agent on booted device (`mobilewright install --force`) |
| `/debug:webview` | `mobilecli webview list` — embedded webviews on booted device |
| `/app:list` | `mobilecli apps list` on booted device |
| `/app:launch` | `mobilecli apps launch --device <booted> $ARGUMENTS` (pass bundle ID) |
| `/app:terminate` | `mobilecli apps terminate --device <booted> $ARGUMENTS` (pass bundle ID) |

Layout:

```
.claude/commands/
├── xcode/
│   └── setup.md
├── mobile/
│   ├── test.md
│   └── snapshot.md
├── device/
│   ├── list.md
│   └── boot.md
├── debug/
│   ├── doctor.md
│   ├── dump.md
│   ├── screenshot.md
│   ├── agent.md
│   └── webview.md
└── app/
    ├── list.md
    ├── launch.md
    └── terminate.md
```

**File-per-group convention:** for a group like `xcode/`, prefer **one consolidated file** (`setup.md`) that runs a sequence of related shell actions, rather than one file per action. Add per-action files only when the action stands alone and is invoked independently.

When adding a new command:
1. Pick a group folder (create one if no existing group fits — keep names short: `xcode/`, `mobile/`, `api/`, `git/`, etc.).
2. Write `<name>.md` with frontmatter (`description`, `allowed-tools`, optional `argument-hint`) plus a `!`-prefixed shell line.
3. Keep the `allowed-tools` glob tight so the bash auto-runs without permission prompts.

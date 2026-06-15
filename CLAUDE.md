# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Allwright is in **early-stage development**. Mobile surface (`apps/mobile/`) is scaffolded with mobilewright running against the iOS Contacts app as a smoke test. Web and API surfaces are not yet started. The sections below describe both the **current** layout and the **intended** end state.

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

Utility methods under `core/utils/` (and anywhere else in `core/`) **must have unit tests**. Allwright is itself a testing framework — shipping untested helpers to manual QAs would undermine the product. Pick a runner (Vitest or Jest) when the first utility lands and stick with it. End-to-end suites under `apps/` exercise real targets and are not a substitute for unit tests on the helpers they depend on.

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
│   └── mobile/
│       ├── mobilewright.config.ts             # regression suite — testDir: ./sample/tests
│       ├── snapshots.config.ts                # locator-discovery — testDir: ./sample/snapshots
│       ├── global-setup.ts                    # walks projects[] and adb-grants Android perms
│       ├── utils/
│       │   ├── aria.types.ts                  # MobileAriaRole union (mirrors ROLE_TYPE_MAP)
│       │   └── mobile.utils.ts                # MobileUtils extends CoreUtils
│       └── sample/
│           ├── resources/
│           │   └── snapshots/                 # one <platform>_<state>.json per dumped screen (gitignored)
│           ├── screens/
│           │   ├── ios/                       # iOS Contacts POMs (4 screens)
│           │   └── android/                   # Android Contacts POMs (4 screens)
│           ├── tests/                         # REGRESSION SUITE — discovered by mobilewright.config.ts
│           │   ├── mobile_ios.spec.ts         # iOS suite (serial, add/edit/delete + 2 fixme)
│           │   └── mobile_android.spec.ts     # Android suite (serial, add/edit/delete)
│           └── snapshots/                     # LOCATOR-DISCOVERY TOOLING — discovered by snapshots.config.ts
│               ├── _snapshots_ios.spec.ts     # iOS view-tree captures → resources/snapshots/
│               └── _snapshots_android.spec.ts # Android view-tree captures → resources/snapshots/
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
- `apps/<surface>/utils/<surface>.utils.ts` — concrete subclass. Today only `apps/mobile/utils/mobile.utils.ts` exists: `class MobileUtils extends CoreUtils<Locator, Screen>` declares its own `getByRole(role: AriaRole, name?)` against the mobile-scoped role union (in `apps/mobile/utils/aria.types.ts`), and adds mobile-only primitives (swipe up/down/left/right, longPress, doubleTap, swipeElement, hardware buttons, coordinate tap, iOS `getByType`) plus the `expect*` assertion helpers wired to mobilewright's `expect`. The user-facing constructor param is named `screen` so test code reads naturally (`new MobileUtils(screen)`) — internally it's stored as `this.root`.

**Adding a new surface (web):**
1. Confirm the surface's root/locator types structurally satisfy `LocatorRoot<L>` / `LocatorLike`.
2. Create `apps/<surface>/utils/aria.types.ts` with the surface-scoped `AriaRole` union (web's covers far more roles than mobile — link, heading, cell, row, dialog, tab, etc.).
3. Create `apps/<surface>/utils/<surface>.utils.ts` extending `CoreUtils<SurfaceLocator, SurfaceRoot>` and declare `getByRole(role: AriaRole, name?)` against the surface's role union.
4. Add surface-only primitives (web hover/dragAndDrop, etc.) as methods on the subclass.
5. Mirror the `expect*` shape so the assertion surface stays uniform across surfaces.

**API surface is a different shape.** `CoreUtils` assumes a locator-based UI model — REST has no locator tree. When the API surface lands, expect a **sibling abstraction**, not an extension: a separate `ApiClientLike` contract and an `ApiUtils` class that does **not** extend `CoreUtils`. The unified API at the *test-author* level will come from naming/method conventions (e.g. `expect*` parity), not class inheritance.

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

- Class name `<Feature>Screen` (e.g. `ContactsListScreen`, `AddContactScreen`) — exported.
- Constructor takes mobilewright `Screen`, instantiates `MobileUtils` internally as `private readonly utils`.
- Locators: `private readonly <name>: Locator`, initialized in the constructor via `this.utils.getByX(...)`.
- Every declared locator must be consumed by at least one method (TS will catch unused — and it caught a dead `dictateButton` once).
- Action methods: **named-object params**, return `Promise<void>`, encapsulate the **full** flow (not partial steps). Never expose positional args.
- Locator interaction goes through `this.utils.tap / fill / etc.` — never call mobilewright APIs directly.
- Assertion helpers: `expectXxx(...)` using `this.utils.expectVisible / expectText / ...`.
- Reference shape: `apps/mobile/sample/screens/contacts-list.screen.ts` and `apps/mobile/sample/screens/add-contact.screen.ts`.

To build a new screen, invoke the `screen-builder` skill (manual mode — token-light).

### Run Commands

| Command | What it does |
|---|---|
| `npm run test:mobile` | Regression suite (mobilewright.config.ts, testDir: `sample/tests`). |
| `npm run test:mobile:snapshots` | Locator-discovery captures (snapshots.config.ts, testDir: `sample/snapshots`). Run with `-- --project=<ios\|android>` to scope. |
| `npm run test:web` | Stub — exits with error until web surface is scaffolded. |
| `npm run test:api` | Stub — exits with error until API surface is scaffolded. |
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

## Project Slash Commands (`.claude/commands/`)

Project-specific commands live in `.claude/commands/`. Files are **grouped by tool/topic** into subfolders — the folder name becomes a `:` namespace prefix on the slash command. Use this to keep the command list scannable as it grows.

| Command | Action |
|---|---|
| `/xcode:setup` | Xcode version → list simulators → boot iPhone 17 Pro Max → `open -a Simulator` |
| `/mobile:test` | `npm run test:mobile -- $ARGUMENTS` |

Layout:

```
.claude/commands/
├── xcode/
│   └── setup.md
└── mobile/
    └── test.md
```

**File-per-group convention:** for a group like `xcode/`, prefer **one consolidated file** (`setup.md`) that runs a sequence of related shell actions, rather than one file per action. Add per-action files only when the action stands alone and is invoked independently.

When adding a new command:
1. Pick a group folder (create one if no existing group fits — keep names short: `xcode/`, `mobile/`, `api/`, `git/`, etc.).
2. Write `<name>.md` with frontmatter (`description`, `allowed-tools`, optional `argument-hint`) plus a `!`-prefixed shell line.
3. Keep the `allowed-tools` glob tight so the bash auto-runs without permission prompts.

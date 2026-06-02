# Allwright

> Unified test automation framework — one API for **Web**, **Mobile**, and **API** testing.

Allwright integrates **Playwright** (web), **Mobilewright** (mobile), and a planned REST client (API) behind a single facade so test authors learn one vocabulary regardless of the surface under test. The long-term goal is a **prompt-driven QA product** where manual testers describe tests in plain English and an LLM composes runnable code against Allwright's primitives.

**Status:** early-stage development. Mobile surface is scaffolded and runs the iOS Contacts app as a smoke test. Web and API surfaces are not yet started.

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

The smoke test launches the iOS **Contacts** app, taps **Add**, fills a sample contact (`Dhaksh Test @ LambdaTest`), saves, and asserts the new entry shows up in the list.

## Run commands

| Command | What it does |
|---|---|
| `npm run test:mobile` | Mobilewright suite under `apps/mobile/` |
| `npm run test:web`    | *(stub — exits non-zero until web surface is scaffolded)* |
| `npm run test:api`    | *(stub — exits non-zero until API surface is scaffolded)* |
| `npm test`            | Alias for `test:mobile` (only working surface today) |

## Architecture in one paragraph

`core/` holds surface-agnostic contracts (`LocatorRoot`, `LocatorLike`) and a generic `CoreUtils<L, R>` facade — **no mobilewright/playwright imports**. Each surface lives under `apps/<surface>/` and provides a concrete subclass (`MobileUtils extends CoreUtils<Locator, Screen>` today; `WebUtils extends CoreUtils<Locator, Page>` later) that adds surface-only primitives (gestures, hover, etc.) and the `expect*` assertion helpers. Test authors only ever import the surface util — the `core/` layer stays invisible. Full architectural rationale lives in [`CLAUDE.md`](./CLAUDE.md).

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

Mobile surface today: `apps/mobile/sample/screens/contacts-list.screen.ts` + `add-contact.screen.ts` driven by `example.spec.ts`.

## Adding a new screen object (POM)

Strict POM: one visible screen state = one class. To extract locators from a live app:

1. Add a `test()` block to `apps/mobile/sample/tests/_dump.spec.ts` that navigates to your target state.
2. `npm run test:mobile -- _dump` — writes the view tree to `_dump_output.txt`.
3. Open `_dump_output.txt`, follow the recipe in `.claude/skills/screen-builder/SKILL.md`.
4. Reference shape: any file in `apps/mobile/sample/screens/`.

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

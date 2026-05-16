# Session Context

Last-updated: 2026-05-17

## Focus area

Allwright framework foundation — facade architecture (`core/` + surface utils), iOS Contacts POM as the smoke test for the mobile surface.

## Where we are

- **Facade pattern landed** in `core/`:
  - `core/contracts/locator.contract.ts` — `LocatorLike`, `WaitState`
  - `core/contracts/root.contract.ts` — `LocatorRoot<L>` (surface-neutral; no `getByRole`, no `AriaRole`)
  - `core/utils/core.utils.ts` — generic `CoreUtils<L, R>` with surface-agnostic find/tap/fill/queries/wait/collection/screenshot
- **Mobile surface** wired:
  - `apps/mobile/utils/aria.types.ts` — mobile-scoped `AriaRole` union
  - `apps/mobile/utils/mobile.utils.ts` — `MobileUtils extends CoreUtils<Locator, Screen>` adds `getByRole`, gestures (swipe up/down/left/right, longPress, doubleTap, swipeElement, pressHardwareButton, tapOnCoordinates), iOS `getByType`, and the full `expect*` family
- **Strict POM** for iOS Contacts:
  - `apps/mobile/sample/screens/contacts-list.screen.ts` — `ContactsListScreen`
  - `apps/mobile/sample/screens/add-contact.screen.ts` — `AddContactScreen`
  - `apps/mobile/sample/tests/example.spec.ts` chains both screens through one fixture
- **Tooling:** `npm run test:mobile` passes (~18s). `_dump.spec.ts` retained for future screen discovery.
- **Skills:** `screen-builder` (manual mode, token-light), `allwright-reviewer` (TS-tuned pre-PR review). Both in `.claude/skills/`.
- **Slash commands:** `/xcode:setup`, `/mobile:test`.

## Decisions made this session

1. **Facade pattern** is the right call given Allwright's "unified" pitch — explicitly justified vs. duplicate-per-surface or `any`-typed alternatives.
2. **Two interfaces in `core/contracts/`** (`LocatorLike`, `LocatorRoot`) — not one merged interface. Root finds; Locator acts. Merging would force fake methods or lose type safety.
3. **`core/` stays surface-neutral** — no `screen`/`page` vocabulary, no `AriaRole`, no mobilewright/Playwright imports. `getByRole` carved out to surface subclasses.
4. **POM = strict one-state-per-class.** `ContactsListScreen` and `AddContactScreen` are separate files/classes.
5. **`screen-builder` skill is manual mode** by design. Claude on demand, not driving multi-turn walks (per `feedback_token_light_workflow.md` memory).
6. **`viewTree()` deliberately NOT in `MobileUtils`** — it's a dev-only introspection API for locator extraction.

## Open threads

- **Web surface** not started. When it lands: `apps/web/utils/aria.types.ts` (broad WAI-ARIA union), `WebUtils extends CoreUtils<Locator, Page>`, mirror `expect*` shape.
- **API surface** not started. Will be a **sibling abstraction** (`ApiClientLike` + `ApiUtils` that does NOT extend `CoreUtils`) — REST has no locator tree.
- **No `tsconfig.json`** at repo root. Mobilewright currently compiles via its own config. Worth adding a project-level `tsconfig.json` with `strict: true` to enforce type discipline once `core/` grows.
- **`core/utils/` has no unit tests yet.** The feedback memory says every util must ship with tests. Currently `CoreUtils` is generic enough that tests would need fake `LocatorLike`/`LocatorRoot` implementations. Pick Vitest or Jest when the first concrete helper lands.
- **`package-lock.json` is gitignored.** Standard practice is to commit. Revisit before packaging.
- **Mobilewright `--config` flag bug** (drops `platform` key) — workaround in place (`cd apps/mobile && mobilewright test`). Revisit on each mobilewright bump.
- **`launchApp` cold-sim flake** on first run after the simulator restarts (`Error: launchApp: timed out`). Retry passes. Either bump retry count in config or pre-warm Contacts app in a fixture before this hits CI.
- **Multiple `output.txt` artifacts** appeared/disappeared during the session. Standard path now: `apps/mobile/sample/tests/_dump_output.txt` (gitignored). Root `output.txt` also gitignored as legacy.

## Next intended step

User's call. Most likely candidates:
1. **Add Detail / Edit / Search screens** for iOS Contacts — re-use `_dump.spec.ts` workflow.
2. **Scaffold the web surface** — bootstrap `apps/web/` with Playwright config, `WebUtils`, a first POM.
3. **Add `tsconfig.json`** with strict typing and verify `core/` + `apps/mobile/` compile cleanly.
4. **Add the first unit test** in `core/utils/` (pick Vitest or Jest).

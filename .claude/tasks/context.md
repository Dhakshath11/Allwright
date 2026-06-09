# Session Context

Last-updated: 2026-06-10

## Focus area

Android Contacts suite end-to-end (create / edit / delete), mobilewright multi-project matrix (`projects[]` with per-platform `testMatch`), `global-setup` rewrite to read the matrix, stylistic ESLint rules, and a `clear()` workaround that was tried and **discarded** as broken.

## Where we are

### Mobile surface — Android (suite complete this session)

- **POMs** in `apps/mobile/sample/screens/android/`:
  - `contacts-list.screen.ts` — search bar testId, FAB testId, "All contacts" title, "No contacts yet" empty state.
  - `add-contact.screen.ts` — header `"Create contact"`, `getByLabel('First name'/'Last name')`, `getByText('Company')` (TextView label that mobilewright walks to the sibling EditText on fill), `getByText('Save')`, `getByLabel('Cancel')`.
  - `contact-detail.screen.ts` — `nav_back_icon`, `menu_star`, `menu_insert_or_edit` (Edit), `menu_settings`, `large_title`, `organization_name`, `getByText('Delete')` at the bottom of the scroll view. `expectAtDetailScreen` discriminates by name + Edit button (lesson #10). `expectMobileNumber({ dialedNumber })` uses a digit-spaced regex tolerant of any phone-formatting locale. `waitForConfirmDialog()` waits on `getByText('Cancel')` as the dialog-only discriminator.
  - `edit-contact.screen.ts` — header `"Edit contact"`, save/cancel, first/last/company fills, `mobileField = getByText('+1')` (initial country-code prefix state).
- **Spec** `apps/mobile/sample/tests/mobile_android.spec.ts` — three working tests (add → edit → delete) wrapped in `test.describe.configure({ mode: 'serial' })` so the state chain holds even under `fullyParallel: true`.
- **Delete flow lives on the detail screen** (Android divergence from iOS: iOS hides Delete at the bottom of the *edit* form). Same `swipeUntilVisible` pattern, different screen.
- **No `tapAddPhone` step on Android** — the phone EditText is rendered immediately with `"+1"` as country-code prefix. `fillMobile` just fills.
- **`_dump_android.spec.ts`** has four entries (list / add / contact-detail / edit form). The detail and edit dumps assume "Dhaksh Test" is present — re-running them on a populated state is the locator-stacking gotcha called out in their comments.

### `clear()` attempted and removed

- Added `MobileUtils.clear(locator)` that sent `'\b'.repeat(N + 3)` via `locator.fill`, betting on soft keyboards mapping `\b` to Backspace.
- **Gboard on Pixel 10 Pro (Android 13+) does NOT honor `\b`.** Silent no-op. Filling on top of a populated phone produced `"+1 735-324-21657353242165"` style garbage on re-runs.
- Method **removed**. Replaced with a `NOTE:` comment block in `MobileUtils` that spells out the gap and documents the upstream contribution needed (`Locator.clear()` + `'BACKSPACE'` HardwareButton).
- `EditContactScreen.fillMobile` now assumes a clean pre-state (fresh contact, "+1" prefix only). For re-runs, either run the full serial chain or delete the contact manually.
- Lesson #12 in `lessons.md` captures the broader rule: don't ship a "best-effort" workaround for a missing primitive — leave the gap visible.

### `mobilewright.config.ts` — multi-project matrix

- Replaced the top-level `platform`/`bundleId` config with a `projects[]` matrix:
  ```ts
  projects: [
    { name: 'ios',     testMatch: /_ios\.spec\.ts$/,     use: { platform: 'ios',     bundleId: 'com.apple.MobileAddressBook', deviceName: /iPhone 17 Pro/ } },
    { name: 'android', testMatch: /_android\.spec\.ts$/, use: { platform: 'android', bundleId: 'com.google.android.contacts', deviceName: /Pixel 10 Pro/ } },
  ]
  ```
- `workers: 2`, `fullyParallel: true` at the top level. Within a spec file, `test.describe.configure({ mode: 'serial' })` keeps add → edit → delete ordered.
- **`testMatch` is load-bearing.** Without it, every project runs every discovered spec → spec count × project count (the user saw 8 specs × 2 projects = 16). The filename convention `<feature>_<platform>.spec.ts` makes the regex trivial.

### `global-setup.ts` — projects-aware rewrite

- Old check `if (config.platform !== 'android') return;` was a no-op bug after the projects refactor — `config.platform` is now `undefined` (lives under `projects[].use.platform`). Permissions were never being granted.
- Rewrite walks `config.projects ?? []`, narrows to entries with `use.platform === 'android' && bundleId`, and runs `adb -e shell pm grant` for each package × each dangerous permission.
- Tolerated adb error substrings expanded to three: `"has not requested permission"` (manifest doesn't declare it), `"no devices/emulators found"`, `"device not found"` (iOS-only run with no Android emulator up). Any other failure throws.

### ESLint stylistic rules

- Added `@stylistic/eslint-plugin` as a devDependency and a new `allwright/rules` config block in `eslint.config.mts`:
  - **Correctness:** `@typescript-eslint/no-unused-vars` (`{ args: 'none', caughtErrors: 'none' }`), `@typescript-eslint/no-floating-promises`, `no-var`, `eqeqeq` (with `null: 'ignore'`).
  - **Style:** `@stylistic/quotes: single`, `@stylistic/semi: always`, `@stylistic/object-curly-spacing: always`, `@stylistic/indent: 2`, `@stylistic/comma-dangle: always-multiline`.
- `lint:fix` cleaned up the config's own double-quotes and one missing space across the repo.

## Decisions made this session

1. **Per-project `testMatch` over `--project` flag at every invocation** — keeps the default `npm run test:mobile` doing the right thing (iOS specs to iOS, Android to Android). Filename convention is the public contract.
2. **File-level `test.describe.configure({ mode: 'serial' })`** for the stateful suites — `fullyParallel: true` stays at the config level for cross-file parallelism; serial mode is scoped to the file where the add → edit → delete state chain lives.
3. **Remove `clear()` rather than ship the broken backspace workaround** — inverse of lesson #8: when the framework idiom is missing, document the gap; don't substitute a runtime hack that creates false confidence (lesson #12).
4. **`waitForConfirmDialog()` over hard sleep** — wait on a dialog-only locator (`getByText('Cancel')` — the detail screen has no Cancel) so the wait is bounded by the actual rendering event, not a magic 500ms.
5. **`expectAtDetailScreen` checks name AND Edit button visible** — lesson #10: a single text match can pass on the wrong screen; the Edit button is the screen-discriminator.
6. **`expectMobileNumber({ dialedNumber })` uses a digit-spaced regex** — `/7\D*3\D*5\D*3.../` tolerates any locale formatting Android applies. Avoids hard-coding "+1 735-324-2165" or "(735) 324-2165".
7. **`@stylistic/*` instead of relying on prettier** — single tool (ESLint) for both correctness and style; no second config to keep in sync. `lint:fix` covers most fixes automatically.

## Open threads

- **`Locator.clear()` upstream PR** — needed for any field-edit test that runs on a populated input. Add `'BACKSPACE'` / `'DEL'` to `HardwareButton` enum at the same time.
- **`autoGrantPermissions: true` on `LaunchOptions`** — carried over from last session; would let us delete `global-setup.ts` entirely.
- **`ROLE_TYPE_MAP` export from `@mobilewright/core`** — carried over; would let `apps/mobile/utils/aria.types.ts` collapse to `export type { AriaRole } from '@mobilewright/core'`.
- **iOS off-screen `(0,0)` bounds + `isVisible:true` quirk** — carried over, lower priority.
- **`--config <path>` cwd bug** — carried over.
- **CodeQL** — still commented out in CI workflow, pending repo Settings → Code security → Code scanning being enabled (Advanced mode).
- **Web surface** still not started.
- **API surface** still not started.
- **`core/utils/` still has no unit tests** — `swipeUntilVisible` is the canonical first one.
- **iOS suite under projects matrix** — the iOS spec ran fine pre-matrix; should be re-verified end-to-end under the new config now that `testMatch: /_ios\.spec\.ts$/` is in effect.
- **Delete-confirmation dialog dump** — not captured yet. `confirmDelete()` uses `getByText('Delete').last()` as a best-guess; tighten once dumped.

## Next intended step

User's call. Likely candidates:
1. Re-verify the iOS suite under the projects matrix (`npm run test:mobile -- mobile_ios`).
2. File the new mobilewright issues (`Locator.clear()`, `'BACKSPACE'` HardwareButton, `autoGrantPermissions`, `ROLE_TYPE_MAP` export).
3. Stage and commit the Android suite + projects-matrix changes.
4. Start the first `core/utils/` unit test (`swipeUntilVisible`).

# Session Context

Last-updated: 2026-06-03

## Focus area

iOS Contacts POM expansion (Add → Edit → Delete flows), `test.step` made mandatory across all screens, mobilewright bug-filing prep.

## Where we are

- **Four iOS Contacts screens:**
  - `contacts-list.screen.ts` — `ContactsListScreen`
  - `add-contact.screen.ts` — `AddContactScreen`
  - `contact-detail.screen.ts` — `ContactDetailScreen` (new this session)
  - `edit-contact.screen.ts` — `EditContactScreen` (new this session)
- **Three test cases** in `mobile.spec.ts` (renamed from `example.spec.ts`):
  - `adds a new contact` — asserts on detail screen after save (previously asserted on list, which passed for the wrong reason — see lesson #10)
  - `edits a contact and adds a phone number`
  - `deletes a contact` — scrolls to Delete Contact, screenshots the action sheet (both to disk AND `testInfo.attach`'d to HTML report), confirms delete
- **`MobileUtils.swipeUntilVisible(locator, { maxSwipes?, minSwipes?, direction? })`** added — `minSwipes` forces unconditional swipes for elements with lying `isVisible` flags (iOS placeholder `(0, 0)` bounds case)
- **`test.step` mandate** — every public screen method body wraps in `await test.step(name, async () => { ... })`. Enforced by:
  - README §"Screen action methods MUST use `test.step`"
  - `screen-builder` skill template updated
  - `allwright-reviewer` skill — new `[Critical]` checklist item + Example 11
- **Screenshot artifact pattern** — capture once, write to disk AND `testInfo.attach` to report. See `deletes a contact` test.

## Decisions made this session

1. **`test.step` everywhere on the screen action layer** — chosen over `Error.captureStackTrace` runtime hack. Reason: enterprise production-grade observability, recognized by every Playwright tool, named steps benefit the prompt-driven QA end goal. Hack was reverted, idiom adopted.
2. **`swipeUntilVisible` lives in `MobileUtils`, not `CoreUtils`** — swipe is a mobile primitive. The post-swipe `isVisible` check happens AFTER each swipe (early-exit), not before — cleaner control flow + every swipe gets verified immediately.
3. **Delete Contact uses StaticText, not Button** — verified from dump; iOS Contacts has no Button "Delete Contact". Locator: `this.utils.getByText('Delete Contact')`.
4. **Action-sheet confirm tap targets `.last()`** of `getByText('Delete Contact')` — the sheet renders after the form button in the view tree. Working hypothesis; verify on next successful run.
5. **Screenshot artifacts attach to report AND save to disk** — `testInfo.attach` is the canonical Playwright reporting API; `fs.writeFileSync` alone produces a file the report can't see (lesson #9).

## Open threads

- **Mobilewright bug filing** — user is a contributor; planning to file two issues:
  1. `--config <path>` fails with `Unsupported platform: "undefined"` when cwd ≠ config's directory. Reproducer documented (works from `apps/mobile/`, fails from repo root). Draft text was prepared.
  2. First-run agent install (~12s) consumes the test's timeout budget, causing `launchApp: timed out waiting for "com.apple.MobileAddressBook"` on cold-sim runs. Should be a separate setup-phase budget.
  - Optional third: off-screen iOS accessibility elements reported with `isVisible: true` + `bounds: (0, 0)` (causes our `swipeUntilVisible` quirk). Lower priority.
- **Delete Contact scroll edge case** — user nudged `minSwipes: 5 → 2` in `scrollToDeleteContact` after testing. May still flake if the form gets longer (e.g., more fields added); revisit if delete test starts failing intermittently.
- **`mobile.spec.ts` tests are state-dependent** — add must run before edit must run before delete. Mobilewright runs same-file tests in declaration order with 1 worker, so OK locally. Will break under sharding/parallel; future fix is a `globalSetup` that seeds `Dhaksh Test`.
- **`_dump.spec.ts` dependency on Dhaksh Test** — the `dump: edit contact form` case assumes the contact exists; fails in clean state because dumps run alphabetically before `mobile.spec.ts`. Either reorder or skip-on-missing.
- **Web surface** still not started. When it lands: `apps/web/utils/aria.types.ts` (broad WAI-ARIA union), `WebUtils extends CoreUtils<Locator, Page>`, mirror `expect*` shape, **same `test.step` mandate** (use `@playwright/test`'s `test.step`).
- **API surface** still not started. Sibling abstraction (`ApiClientLike` + `ApiUtils`), no `CoreUtils` extension. Decide whether `test.step` applies (probably yes for parity).
- **No `tsconfig.json`** at repo root. Mobilewright compiles via its own config.
- **`core/utils/` still has no unit tests** — feedback memory says every util must ship with tests. `swipeUntilVisible` is the first non-trivial helper that needs one. Pick Vitest or Jest.
- **`package-lock.json` is gitignored.** Revisit before packaging.

## Next intended step

User's call. Most likely candidates:
1. **File the two mobilewright bugs** as a contributor.
2. **Verify the delete test passes end-to-end** under current scroll settings (`minSwipes: 2, maxSwipes: 5`).
3. **Scaffold the web surface** with `test.step` baked in from day one.
4. **Add tsconfig.json + first unit test** for `swipeUntilVisible`.

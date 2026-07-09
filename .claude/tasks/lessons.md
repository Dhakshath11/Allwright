# Lessons

Mistakes the user has corrected, with the preventive rule and a concrete example. Read this file before starting non-trivial work.

---

## 1. Don't leak surface vocabulary into `core/`

**Mistake:** I named the locator-root contract `ScreenLike` and used `screen` as the protected field in `CoreUtils`. Both "screen" and "page" are surface-specific (mobilewright vs. Playwright).

**Rule:** `core/` is surface-agnostic. No "screen", no "page" in type names, file names, or field names. Use neutral vocabulary — `root` for the locator-tree entry point, `LocatorRoot` for its contract.

**Example:**
- ❌ `interface ScreenLike { ... }` in `core/contracts/screen.contract.ts`, `protected readonly screen: S` in `CoreUtils`
- ✅ `interface LocatorRoot { ... }` in `core/contracts/root.contract.ts`, `protected readonly root: R` in `CoreUtils`

---

## 2. ARIA role unions differ per surface — don't pin them in `core/`

**Mistake:** I declared a shared `AriaRole` union in `core/contracts/root.contract.ts` and put `getByRole` on `CoreUtils`. Mobile's role set is narrow; web's (Playwright) is much broader (link, heading, cell, row, dialog, tab, etc.). Pinning one union in `core/` would force web to either lie or override.

**Rule:** `getByRole` belongs on each surface's util subclass, declared against a surface-scoped `AriaRole` type in `apps/<surface>/utils/aria.types.ts`. `core/` exposes only the truly cross-surface finders (`getByText`, `getByTestId`, `getByLabel`, `getByPlaceholder`).

**Example:**
- ❌ `getByRole(role: AriaRole, ...)` on `CoreUtils` with `AriaRole` in `core/contracts/`
- ✅ `getByRole(role: AriaRole, name?): Locator` declared on `MobileUtils`, importing `AriaRole` from `apps/mobile/utils/aria.types.ts`

---

## 3. Don't extract locators into a separate `locators/` directory

**Mistake:** I evaluated a proposed "locators directory" pattern and almost endorsed it as a separation-of-concerns improvement.

**Rule:** Locators live **inside the screen object class** that uses them — co-located with the actions they support. The separate-locators pattern is a 2010-era Selenium habit; modern frameworks (Playwright, mobilewright) use stable role/testId selectors that don't need extraction. Splitting them creates two-file ping-pong and breaks the prompt-driven QA goal (the LLM has to load both files to compose one action).

**Example:**
- ❌ `apps/mobile/sample/locators/contact.locators.ts` + thin screen class that imports them
- ✅ `private readonly addButton: Locator` declared and initialized inside `ContactsListScreen`

---

## 4. Don't add pure-passthrough methods to the facade

**Mistake:** Initial `CoreUtils` was ~30 methods, ~70% of which were 1:1 passthroughs (`async tap(locator) { await locator.tap(); }`). This obscures more than it helps, and hurts prompt-friendliness because the LLM already knows mobilewright's native API from training.

**Rule:** Methods on `CoreUtils` / surface utils should earn their place — either they enable cross-surface uniformity, add a cross-cutting concern (logging, retry), or simplify a common multi-step pattern. Pure passthroughs are anti-pattern. Specifically: `viewTree()` is dev-only (used during locator extraction); keep it OUT of the facade — call it directly on `screen` in throwaway dump specs with a comment explaining why.

**Example:**
- ❌ `MobileUtils.viewTree(): Promise<ViewNode[]> { return this.root.viewTree(); }` — pure passthrough, never used in production tests
- ✅ `apps/mobile/sample/snapshots/_snapshots_<platform>.spec.ts` calls `await screen.viewTree()` directly with `// dev-only API, deliberately kept out of MobileUtils`

---

## 5. Default Claude workflows to manual / batch — not per-step interactive walks

**Mistake:** The first version of `screen-builder` was an interactive walk that asked 5 questions per element × ~20 elements = 100 round trips per screen (~15k tokens). Token-heavy and slow even though it satisfied "review every locator."

**Rule:** For any skill that touches user-facing review, default to **manual mode** — Claude provides the recipe + template, the user does the rote extraction themselves, Claude is consulted only for ambiguous decisions or final review. Token cost drops ~10× with no loss of rigor. Per-step interactive flows should be opt-in (`--strict` mode), not default.

**Example:**
- ❌ Skill walks the user through each element one-by-one, accumulating turns
- ✅ Skill = recipe + selector priority table + class template. User extracts manually. Asks Claude only for "which selector for THIS node?" or "review my finished file."

---

## 6. Don't trust `isVisible` for iOS elements with placeholder `(0, 0)` bounds

**Mistake:** I built `swipeUntilVisible` using `isVisible` as the stop condition. For the iOS Contacts edit form, the "Delete Contact" StaticText reports `isVisible: true` with `bounds: { x: 0, y: 0, width: 330, height: 25 }` while off-screen — so the loop short-circuited on the first iteration without swiping, then `tap` hit the Dynamic Island (the off-screen element's coordinates clamp to screen bounds).

**Rule:** `isVisible` reflects the framework's visibility flag, not viewport presence. iOS view trees commonly report off-screen accessibility elements as visible with placeholder bounds. For those cases, force a minimum number of unconditional swipes (`minSwipes` option on `swipeUntilVisible`) — don't let `isVisible` drive scrolling alone.

**Example:**
- ❌ `swipeUntilVisible(locator)` — exits immediately if `isVisible === true`, even when the element is off-screen
- ✅ `swipeUntilVisible(locator, { minSwipes: 5, maxSwipes: 5 })` — forces 5 unconditional swipes for elements with lying bounds

---

## 7. Verify the dump shows the target element type BEFORE switching a locator

**Mistake:** When `tap('Delete Contact')` was misfiring, I changed `getByText('Delete Contact')` → `getByRole('button', 'Delete Contact')` on the assumption that a Button exists alongside the StaticText (like the "Add Photo" / "Insert add phone" pattern). It doesn't — Delete Contact is StaticText only. The locator stopped resolving entirely; test failed with `no matching element found after 5000ms`. User had to point out: "delete contact is only a static text not a button."

**Rule:** Before changing the **type** of a locator (text → role, label → testId), grep the dump for the target type. Don't extrapolate from a *related* pattern; iOS UI is inconsistent — some labels have a Button + StaticText pair, others have only a StaticText.

**Example:**
- ❌ Switch to `getByRole('button', 'Delete Contact')` because "iOS usually has both Button and StaticText"
- ✅ `grep -A 3 '"label": "Delete Contact"' apps/mobile/sample/resources/snapshots/ios_edit_contact_form.json` first — confirm type before changing

---

## 8. Prefer framework idioms (`test.step`) over clever runtime tricks (`captureStackTrace`)

**Mistake:** To fix failure reports pointing at `core/utils/core.utils.ts:46` instead of the screen method, I wrapped every CoreUtils method in `try/catch + Error.captureStackTrace(e, this.<method>)` to strip the wrapper frame. It worked, but the user asked "is this good practice?" — and the honest answer was no. Playwright's `test.step()` is the idiomatic, production-grade pattern: step names appear in HTML reports, failures auto-attribute to the step's call site, and it's recognized by every Playwright observability tool (Allure, Currents, Reportportal).

**Rule:** When a framework provides a first-class extension point for an observability/reporting concern, use it — even if a runtime hack would achieve the same effect with less boilerplate. The hack works for *you*; the idiom works for every engineer who reads the codebase later, every reporter that consumes the trace, and every QA who reads the HTML report. For Allwright specifically: every public screen method body wraps in `test.step(name, async () => {...})`. Enforced by `screen-builder` template + `allwright-reviewer` `[Critical]` check + README.

**Example:**
- ❌ `protected async invoke(caller, fn) { try { return await fn(); } catch (e) { Error.captureStackTrace(e, caller); throw e; } }` + per-method boilerplate
- ✅ `async tapAdd() { await test.step('Tap Add button', async () => { await this.utils.tap(this.addButton); }); }`

---

## 9. `fs.writeFileSync` saves to disk; the HTML report doesn't see it

**Mistake:** Saved the delete-confirmation screenshot via `fs.writeFileSync(path, await screen.screenshot())` and assumed it would appear in the Playwright HTML report. It didn't — file existed on disk, report had no Attachments section. User noticed: "I dont see the screenshot of deleted added in the report why is that?"

**Rule:** Playwright's HTML report only surfaces artifacts registered through `testInfo.attach(name, { body, contentType })` (or auto-captured via `use: { screenshot: 'only-on-failure' }`). A raw `fs.writeFileSync` produces a file the report never references. For both disk persistence AND report visibility, capture the buffer once and do both:

**Example:**
- ❌
```ts
fs.writeFileSync(path, await screen.screenshot());
// disk: yes / report: no
```
- ✅
```ts
const buffer = await screen.screenshot();
fs.writeFileSync(path, buffer);
await testInfo.attach('delete-confirmation', { body: buffer, contentType: 'image/png' });
// disk: yes / report: yes / one capture, one network roundtrip
```

---

## 10. Assertions can pass for the WRONG reason — verify the screen, not just the text

**Mistake:** After `form.save()` (Add Contact form), the test asserted `await list.expectContactInList('Dhaksh Test')` and passed. But the app actually navigates to the **Contact Detail** screen after save, not back to the list. The assertion passed because `getByText('Dhaksh Test')` matched the name on the **detail** screen, not the list — a false-green that we'd have shipped if not caught.

**Rule:** When a save / submit / confirm transitions to an unexpected screen, the next assertion may pass on the wrong screen. Always assert a screen-discriminator first (`expectAtDetailScreen({ name })`) before asserting on data — the screen-discriminator catches the wrong-screen case, the data assertion confirms correctness on the right screen.

**Example:**
- ❌ `await form.save(); await list.expectContactInList('Dhaksh Test');` — passes because text exists on detail screen
- ✅ `await form.save(); await detail.expectAtDetailScreen({ name: 'Dhaksh Test' });` — fails if navigation differs from expectation

---

## 11. A TS union wrapping a third-party string-typed API must mirror the runtime's mapping exactly

**Mistake:** `apps/mobile/utils/aria.types.ts` shipped with 15 ARIA-style role entries (`textbox`, `radio`, `searchbox`, `progressbar`, `menuitem`, etc.) borrowed from WAI-ARIA spec without checking mobilewright's actual runtime. mobilewright's `getByRole(role: string, ...)` resolves the role string against an internal `ROLE_TYPE_MAP` in `node_modules/@mobilewright/core/dist/query-engine.js` — a 12-entry dictionary. Only 3 of our 15 union entries (`button`, `checkbox`, `slider`) overlapped with the map. The other 12 type-checked but never resolved at runtime, falling back to a literal `node.type === 'X'` check that virtually never matched any real element. Result: `LocatorError: no matching element found after 5000ms` with no diagnostic indicating the role *name itself* was the problem.

**Rule:** When you expose a narrower TypeScript union over a third-party API that accepts `string` and resolves it internally, every union member must correspond to a runtime-supported value. Find the upstream mapping (grep the package's source), mirror its keys exactly, and document the manual-mirror contract in the union's JSDoc. **Never widen the union ahead of the runtime** — every speculative entry is a silent-failure trap for the user (and an LLM picking from autocomplete in the prompt-driven QA world).

**Example:**
- ❌
  ```ts
  // 15 entries; 12 silently broken at runtime
  export type AriaRole = 'button' | 'textbox' | 'searchbox' | 'radio' |
    'select' | 'textarea' | 'listbox' | 'menu' | 'menuitem' | 'option' |
    'progressbar' | 'scrollbar' | 'separator' | 'checkbox' | 'slider';
  ```
- ✅
  ```ts
  // Mirrors ROLE_TYPE_MAP in @mobilewright/core/dist/query-engine.js
  export type AriaRole =
    | 'button'    // iOS Button; Android Button / ImageButton
    | 'textfield' // iOS TextField / SearchField; Android EditText
    | 'text' | 'image' | 'switch' | 'checkbox' | 'slider'
    | 'list' | 'listitem' | 'tab' | 'link' | 'header';
  ```
  Plus a JSDoc note that the map isn't exported from `@mobilewright/core` yet — flagged as an upstream contribution to export `type AriaRole = keyof typeof ROLE_TYPE_MAP`.

---

## 12. Don't ship a "best-effort" workaround for a missing framework primitive — leave the gap visible

**Mistake:** mobilewright 0.0.35 has no `Locator.clear()` and no `'BACKSPACE'` HardwareButton. User asked for a `clear` helper on `MobileUtils` to wipe the "+1" prefix off Android's phone EditText before fill. I shipped `clear(locator)` that sent `'\b'.repeat(N)` via `locator.fill` — banking on soft keyboards interpreting the codepoint as Backspace. Gboard on the Pixel 10 Pro emulator (Android 13+) does NOT. The method was a silent no-op: tests appeared to clear, then `fill` appended, producing `"+1 735-324-21657353242165"` style garbage on the second run of the edit test.

**Rule:** When a framework lacks a primitive and the available substitutes are unreliable across devices/locales/keyboards, **do not ship the wrapper**. Document the gap inline (a code comment where the method *would* live), file the upstream issue, and require tests to arrange pre-state instead. A method named `clear` that doesn't reliably clear is worse than no method — it creates false confidence and an LLM picking from autocomplete in the prompt-driven QA world will reach for it. This is the inverse of lesson #8: when the *framework idiom is missing*, don't substitute a runtime hack — leave a load-bearing comment that points at the upstream gap.

**Tells that I'm building a fake-clear:**
- "soft keyboards usually interpret `\b` as Backspace"
- "this is best-effort; if it doesn't work the user can adjust"
- "let me add a small buffer in case of cursor quirks"

If those phrases appear, stop. Either the primitive exists (use it) or it doesn't (document the gap, do not wrap).

**Example:**
- ❌ `async clear(locator) { await locator.fill('\b'.repeat(N + 3)); }` — silent no-op on Gboard; callers see a clear method and assume the field is empty
- ✅ A comment block at the *position* `clear` would occupy that spells out: no native primitive, no working workaround, tests must arrange pre-state, link to the upstream issue. Plus a note on `EditContactScreen.fillMobile` documenting the pre-state assumption.

---

## 13. When the config moves to a `projects[]` matrix, every top-level read of `platform` / `bundleId` becomes a silent `undefined`

**Mistake:** `apps/mobile/global-setup.ts` shipped with `if (config.platform !== 'android') return;` — a clean short-circuit when the config had a top-level `platform` key. We later refactored `mobilewright.config.ts` into a multi-project matrix where `platform` and `bundleId` live under `projects[].use`. The setup's top-level read became `undefined`, the check `undefined !== 'android'` evaluated to `true` on every run, and the function returned before any `adb pm grant` fired. Android permission popups silently came back without any test failing — the setup was just doing nothing.

**Rule:** Any code that imports the mobilewright config and reads platform-scoped fields (`platform`, `bundleId`, `deviceName`, `installApps`) must walk `config.projects ?? []` and pull from `use.*`. Top-level reads are still valid in **single-project** configs but become a load-bearing footgun the moment a second project is added. When refactoring to a matrix, grep for every direct top-level access first — most won't be caught by TS (the fields are all optional in `MobilewrightConfig`, so no type error fires).

**Tells that the bug is present:**
- `config.platform` / `config.bundleId` referenced anywhere outside the projects array — and the file used to work but a recent matrix refactor "didn't change anything".
- Setup runs report success but the behavior they were supposed to produce (permissions granted, env vars set, etc.) doesn't happen.

**Example:**
- ❌ `if (config.platform !== 'android') return;` after the projects refactor — always returns true.
- ✅
  ```ts
  const androidPackages = (config.projects ?? [])
    .map((p) => p.use)
    .filter((u): u is { platform: 'android'; bundleId: string } =>
      u?.platform === 'android' && typeof u.bundleId === 'string')
    .map((u) => u.bundleId);
  ```
  Plus tolerate the "no devices/emulators found" adb error so an iOS-only run doesn't fail when no Android emulator is up.

---

## 15. `device.io.swipe` ignores `duration` — it is silently dropped at the RPC level

**Mistake:** `MobileUtils.swipeUp/Down/Left/Right` and `swipeFromPoint` accepted a `duration` param and passed it to `screen.swipe()`, which forwarded it to `device.io.swipe`. The mobilecli Go server's swipe struct only reads `deviceId, x1, y1, x2, y2` — any extra JSON field is discarded by `json.Unmarshal`. Android hardcodes 1000ms in `adb shell input swipe`; iOS uses WDA's internal default. Neither exposes duration at the RPC level. The param was documented, type-checked, passed through every layer — and did nothing.

**Rule:** `device.io.swipe` has no `duration`. Do not expose it on swipe wrapper methods — a param that type-checks but silently no-ops is a silent-failure trap. If speed control is needed, route through `gesture()` (`device.io.gesture` where each `pointerMove` action has its own `duration` field that IS honoured). Only `longPress` exposes duration at the RPC level — that one is fine.

**Tells that the param is dead:**
- Any `duration` on `swipeUp`, `swipeDown`, `swipeLeft`, `swipeRight`, or `swipeFromPoint`.
- A comment like "transit time in ms" on a `SwipeOptions.duration` field — the option exists in the protocol type but the underlying RPC ignores it.

**Example:**
- ❌ `async swipeUp(distance?: number, duration?: number) { await this.root.swipe('up', { distance, duration }); }` — duration silently no-ops
- ✅ `async swipeUp(distance?: number) { await this.root.swipe('up', { distance }); }` — honest signature
- ✅ Use `gesture([[{ x, y: start }, { x, y: end, time: durationMs }]])` when speed matters

---

## 16. `page.setViewportSize` is not implemented on `MobileWebViewPage`

**Mistake:** After attaching to a WebView (`utils.getByWebView().page()`), called `page.setViewportSize({ width, height })` to fix layout. It threw `page.setViewportSize is not a function` at runtime. `MobileWebViewPage` uses TypeScript declaration merging (`interface MobileWebViewPage extends PlaywrightPage {}`) but only implements a subset of Playwright's `Page` methods — the rest are unimplemented stubs that don't exist at runtime.

**Rule:** `MobileWebViewPage` is not a full Playwright `Page`. Don't call methods not explicitly listed in the mobilewright docs for `WebViewLocator.page()`. If a method throws "not a function", remove the call — there's no fallback. The web `Page` type annotation is a convenience overlay, not a guarantee of full implementation.

**Example:**
- ❌ `await page.setViewportSize({ width: 390, height: 844 });` — throws at runtime
- ✅ Remove the call; the WKWebView renders at whatever size the native container allocates

---

## 17. `terminateApp` in `afterEach`, not `launchApp` — resumption is default on mobile

**Mistake:** Used `device.launchApp(PLAYGROUND)` in `afterEach` to "reset" between tests. `launchApp` on iOS resumes a suspended app at whatever screen it was on (e.g. the success screen after a test that didn't tap Back). The next test's `launchApp` call resumed the suspended app at the success screen instead of launching fresh to the dashboard — breaking the `beforeEach`/`beforeAll` assumptions.

**Rule:** Use `device.terminateApp(bundleId)` in `afterEach` to kill the process. The next `device.launchApp` then always starts the app cold from the home/dashboard screen. `.catch(() => {})` to swallow the error when the app wasn't running.

**Example:**
- ❌ `afterEach: async ({ device }) => { await device.launchApp(PLAYGROUND); }` — resumes at last screen
- ✅ `afterEach: async ({ device }) => { await device.terminateApp(PLAYGROUND).catch(() => {}); }` — kills process; next launch is fresh

---

## 18. `expect*` wrapper methods on `MobileUtils` hide which locator failed

**Mistake:** `MobileUtils` shipped with 10 `expectXxx` wrappers (`expectVisible(l)` → `expect(l).toBeVisible()`, etc.). When an assertion failed, the stack trace pointed to `mobile.utils.ts:168` — not the screen method or spec line that called it. The locator's identity was lost in the wrapper layer. Also, wrappers prevented assertion chaining (`.not.toBeVisible()`) and custom timeout options.

**Rule:** Don't wrap `expect(locator).toAssertionX()` in utility methods. Call `expect(locator).toBeVisible()` etc. directly in screen object methods and spec steps. The line number in the failure report will point at the actual call site. The only legitimate `expect` in utils is a one-off structural assertion that combines multiple locators into a named step — and even then, use `test.step` to name it, not a wrapper.

**Tells that a wrapper is wrong:**
- The wrapper is a 1:1 rename (`expectVisible` → `toBeVisible`)
- The wrapper prevents `.not.` chaining
- The wrapper prevents passing `{ timeout }` options

**Example:**
- ❌ `async expectVisible(l: Locator) { await expect(l).toBeVisible(); }` in utils — failure at `utils.ts:168`
- ✅ `expect(this.editButton).toBeVisible()` in the screen method — failure at `contact-detail.screen.ts:104`

---

## 19. `device.startRecording()` requires `{ output, timeLimit }` — no args crashes at runtime

**Mistake:** Called `device.startRecording()` with no arguments. Crashed immediately with `Cannot read properties of undefined (reading 'output')`.

**Rule:** `device.startRecording({ output: <absolute-path>, timeLimit: <seconds> })` — both args are required. `device.stopRecording()` returns a `RecordingResult` object; the video is at `result.output` (a file path on disk), NOT raw bytes. Read it with `fs.readFileSync(result.output)` before attaching to the report. Import `RecordingResult` from `@mobilewright/protocol`.

**Example:**
- ❌ `await device.startRecording()` — crashes with property read on undefined
- ✅
  ```ts
  const outputPath = path.join(testInfo.project.outputDir, `recording-${Date.now()}.mp4`);
  await device.startRecording({ output: outputPath, timeLimit: 30 });
  // ... test actions ...
  const result = await device.stopRecording();
  await testInfo.attach('recording', { body: fs.readFileSync(result.output), contentType: 'video/mp4' });
  ```

---

## 20. `screen.screenshot()` always returns PNG bytes — never save it as `.jpeg`

**Mistake:** Saved the screenshot to disk as `Preferences_Image.jpeg` and attached with `contentType: 'image/jpeg'`. The bytes are PNG regardless of the filename — the HTML report declared the attachment as JPEG and browsers would refuse to render it.

**Rule:** `screen.screenshot()` always returns PNG bytes. Use `.png` extension and `contentType: 'image/png'` for both disk writes and `testInfo.attach`. If JPEG is needed, a separate image-conversion step is required.

**Example:**
- ❌ `fs.writeFileSync('Preferences_Image.jpeg', await screen.screenshot())` + `contentType: 'image/jpeg'`
- ✅ `fs.writeFileSync('Preferences_Image.png', bytes)` + `contentType: 'image/png'`

---

## 21. Verify exact label text from the live view tree — don't assume it matches the visible UI label

**Mistake:** Used `getByText('SharedPref/Keychain')` (no spaces) based on the visual label. The live view tree shows `'SharedPref / Keychain'` (spaces around the slash). The locator resolved to nothing.

**Rule:** Before writing any `getByText` or `getByTestId` string, confirm the exact value from the captured snapshot JSON. UI display text and view-tree label text often differ (spacing, casing, truncation). The dump is ground truth.

**Example:**
- ❌ `getByText('SharedPref/Keychain')` — assumed from visual label
- ✅ Grep the snapshot JSON: `grep -i "sharedpref" ios_playground_main.json` → confirms `'SharedPref / Keychain'`

---

## 22. Dynamic/post-action UI states need their own snapshot capture — don't guess the node structure

**Mistake:** Assumed `getByText('STATUS SAVED')` would work for the post-save state without capturing a snapshot of that state. The string doesn't exist as a single node; the locator never resolved and the failure was only caught at runtime.

**Rule:** For any UI state that only exists after an action (save confirmation, success banner, error message, status update), add a dedicated capture block that triggers the action first — fill values, tap Save, then dump. Analyse that snapshot to get the real node structure before writing the assertion. Never assume a visually-displayed string maps to a single `StaticText` node.

The snapshot workflow applies to dynamic states too — the only difference is the capture block must navigate to and trigger the state, not just navigate to the screen.

**Example:**
```ts
// In _snapshots_ios.spec.ts — capture the post-save state
test('dump: ios_playground_preferences_saved', async ({ device, screen }) => {
  const utils = new MobileUtils(screen);
  await device.terminateApp(PLAYGROUND_ID).catch(() => {});
  await device.launchApp(PLAYGROUND_ID);
  await utils.tap(utils.getByTestId('SharedPref / Keychain'));
  await utils.fill(utils.getByTestId('username_field'), 'Robert');
  await utils.fill(utils.getByTestId('password_field'), 'test');
  await utils.tap(utils.getByTestId('save_button'));
  // NOW dump — the status node is visible in this state
  await dump(screen, 'ios_playground_preferences_saved.json');
});
```

Then grep the snapshot for the status text to find the real type and identifier before writing the assertion locator.

- ❌ Guess `getByText('STATUS SAVED')` → runtime failure
- ✅ Capture post-save state → grep snapshot → confirm `getByTestId('status_message')` from the dump

---

## 23. All locators must be declared as `private readonly` fields in the constructor — never created inline inside methods

**Mistake:** `expectStatusSaved()` created its locator inline: `await expect(this.utils.getByTestId('status_message')).toBeVisible()` inside the method body rather than declaring `private readonly statusMessage: Locator` in the constructor.

**Rule:** Every locator a screen class uses must be declared as a `private readonly <name>: Locator` field and initialized in the constructor via `this.utils.getByX(...)`. Inline locator creation inside methods breaks POM co-location discipline — the locator map for a screen is its constructor, not scattered through method bodies. The reviewer treats this as `[Minor]` but it compounds quickly across a large screen class.

**Example:**
- ❌ `async expectStatusSaved() { await expect(this.utils.getByTestId('status_message')).toBeVisible(); }` — locator created inline
- ✅
  ```ts
  private readonly statusMessage: Locator;
  constructor(screen: Screen) {
    this.statusMessage = this.utils.getByTestId('status_message');
  }
  async expectStatusSaved() { await expect(this.statusMessage).toBeVisible(); }
  ```

---

## 14. `projects[]` without `testMatch` runs every spec on every project — and the test count multiplies silently

**Mistake:** Added two projects (`ios`, `android`) to `mobilewright.config.ts` without per-project `testMatch`. Running `npm run test:mobile -- mobile_` reported **16 tests in 2 workers** — 8 specs (5 iOS + 3 Android) × 2 projects. The Android project was trying to drive the iOS specs against the Pixel emulator and vice versa. The number "16" only stood out because the user happened to be counting.

**Rule:** Every project in a matrix needs a `testMatch` (or `testIgnore`) that pins it to the specs it actually owns — adopt a filename convention that makes the pattern trivial. The Allwright convention: `<feature>_<platform>.spec.ts` → `testMatch: /_<platform>\.spec\.ts$/`. Add this at the *same time* you add the project, never as a follow-up — the bug between "add project" and "add testMatch" is silent (tests pass on the wrong platform if they happen to be cross-compatible) and the wasted-time cost scales linearly with suite size.

**Tells that the bug is present:**
- Test count is a multiple of the project count — `npm run test:mobile -- <pattern>` reports 2× / 3× / Nx what you expected.
- Specs "work" on platforms they have no business running on (e.g. iOS spec passes on Android because both have a `getByText('Save')` button by coincidence).
- A spec that drives a platform-specific bundleId errors mid-test on the wrong emulator.

**Example:**
- ❌
  ```ts
  projects: [
    { name: 'ios',     use: { platform: 'ios',     bundleId: '…' } },
    { name: 'android', use: { platform: 'android', bundleId: '…' } },
  ]
  // every spec runs under both projects
  ```
- ✅
  ```ts
  projects: [
    { name: 'ios',     testMatch: /_ios\.spec\.ts$/,     use: { … } },
    { name: 'android', testMatch: /_android\.spec\.ts$/, use: { … } },
  ]
  ```
  The filename convention IS the contract. Cross-platform specs need their own dedicated project (or get an explicit testMatch glob that includes them in every relevant project).

---

## 24. iOS system alert labels use typographic (curly) quotes — not ASCII

**Mistake:** `PlaygroundPermissionsAlertScreen` used straight ASCII double quotes in `getByText('"Playground" would like to access the Camera.')` and a straight ASCII apostrophe in `getByRole('button', "Don't Allow")`. The iOS system permission dialog renders labels with typographic curly quotes (U+201C `"`, U+201D `"`, U+2019 `'`). Both locators resolved to nothing; `expectAlertVisible()` timed out with "Expected element to be visible, but it was not."

**Rule:** When writing locators for iOS SYSTEM alerts (camera, microphone, location, etc.), always verify the exact quote codepoints from a captured snapshot — never assume ASCII. iOS uses typographic quotes for alert titles and button labels. Use explicit Unicode escapes (`“`, `”`, `’`) or the actual curly characters, and add a comment pointing to the snapshot for future verification.

**Tells that the bug is present:**
- `getByText('"<AppName>" would like to...')` with straight `"` around the app name
- `getByRole('button', "Don't Allow")` with straight apostrophe
- Test reaches the alert step but times out at `toBeVisible`

**Example:**
- ❌
  ```ts
  getByText('"Playground" would like to access the Camera.')   // straight quotes
  getByRole('button', "Don't Allow")                           // straight apostrophe
  ```
- ✅
  ```ts
  // Verified from ios_playground_permissions_popup.json — U+201C/201D/2019
  getByText('"Playground" would like to access the Camera.')   // curly double quotes
  getByRole('button', 'Don't Allow')                           // curly apostrophe
  ```

---

## 25. `page.goto('/')` with a path-containing `baseURL` navigates to the domain root — not the path

**Mistake:** Set `baseURL: 'https://demo.playwright.dev/todomvc'` in `playwright.config.ts` and used `page.goto('/')` in `beforeEach`. Navigation landed on `https://demo.playwright.dev/` (a 404) — not `https://demo.playwright.dev/todomvc/`. The URL path in `baseURL` is discarded when `goto` receives an absolute-path argument starting with `/`.

**Rule:** Playwright resolves `goto(path)` relative to the *origin* of `baseURL`, not the full URL. If your app lives under a sub-path (e.g. `/todomvc/#/`), either (a) set `baseURL` to the domain origin only (`https://demo.playwright.dev`) and use the full path in `goto('/todomvc/#/')`, or (b) set `baseURL` to include the trailing slash (`https://demo.playwright.dev/todomvc/`) and use `goto('.')`. Never mix a sub-path `baseURL` with a root-relative `goto('/')`.

**Example:**
- ❌ `baseURL: 'https://demo.playwright.dev/todomvc'` + `goto('/')` → lands on domain root (404)
- ✅ `baseURL: 'https://demo.playwright.dev'` + `goto('/todomvc/#/')` → lands on the TodoMVC app

---

## 26. `page.accessibility.snapshot()` is removed from Playwright types — use `locator.ariaSnapshot()`

**Mistake:** Used `page.accessibility.snapshot()` in the web snapshot spec to capture the accessibility tree. TypeScript error: `Property 'accessibility' does not exist on type 'Page'`. The `accessibility` API was deprecated in Playwright 1.46 and removed from the type definitions by 1.58.

**Rule:** Use `page.locator('body').ariaSnapshot()` (added in Playwright 1.47). It returns a YAML string representing the full ARIA node tree — roles, names, states (checked, selected, expanded) — readable by both humans and tools. Write it as `.yaml` (not `.json`). The YAML format is actually more readable for locator discovery than the old JSON object format.

**Example:**
- ❌ `const tree = await page.accessibility.snapshot();` — type error in Playwright ≥ 1.47
- ✅ `const tree = await page.locator('body').ariaSnapshot();` → YAML string → write with `.yaml` extension

---

## 27. Web snapshot tests need independent `page.goto()` in each test — mobile's persistent-session pattern doesn't apply

**Mistake:** Wrote web snapshot tests as a sequential state chain where each test navigates from the previous test's final state (same pattern as mobile's `_snapshots_ios.spec.ts` which works because mobilewright keeps the app open across serial tests). The second test timed out trying to `fill()` an input — Playwright had given it a fresh blank page with no URL loaded.

**Rule:** Playwright gives each test a fresh browser context and a blank page. There is no cross-test page persistence. Every snapshot test (and every regression test not using `beforeEach`) must call `page.goto(url)` to set up its own starting state. The mobile pattern of navigating forward from previous state is mobilewright-specific — it cannot be ported to Playwright without explicitly sharing the `page` fixture across tests using a workaround (`test.extend` with shared page, or `beforeAll`).

**Example:**
- ❌
  ```ts
  test('dump: with items', async ({ page }) => {
    // assumes previous test navigated to /todomvc/#/ — times out, blank page
    await page.fill('input[placeholder="..."]', 'Buy groceries');
  });
  ```
- ✅
  ```ts
  test('dump: with items', async ({ page }) => {
    await page.goto('/todomvc/#/');  // always set up own state
    await page.fill('input[placeholder="..."]', 'Buy groceries');
  });
  ```

---

## 28. Playwright's `Locator` and `Page` don't satisfy `LocatorLike` / `LocatorRoot` — use inlined adapter classes

**Mistake:** Tried to write `WebUtils extends CoreUtils<Locator, Page>` using Playwright's native types directly. TypeScript rejects it because `Locator` is missing `getText()`, `getValue()`, `isSelected()`, `isFocused()` (Playwright uses `innerText()`, `inputValue()`, and `evaluate()` instead), and `Page.screenshot()` uses `{ type }` not `{ format }`.

**Rule:** Create two adapter classes inlined in `web.utils.ts` — not in separate files:
- `export class WebLocator implements LocatorLike` — wraps Playwright's `Locator`, maps the contract to Playwright's actual API. Expose `readonly locator: Locator` for screen objects to access the raw Playwright Locator for `expect()` calls.
- `class WebPage implements LocatorRoot<WebLocator>` — unexported, wraps `Page`, bridges the `screenshot({format})` vs `screenshot({type})` mismatch.
Then `WebUtils extends CoreUtils<WebLocator, WebPage>`.

Screen objects type their locator fields as `WebLocator` and write assertions as `expect(this.field.locator).toBeVisible()` — the `.locator` accessor is the only visible difference from the mobile pattern.

**Tells that the adapter is needed:**
- `Type 'Locator' does not satisfy 'LocatorLike'` — missing methods
- `Property 'getText' does not exist on type 'Locator'`

**Example:**
- ❌ `class WebUtils extends CoreUtils<Locator, Page>` — TypeScript error, Locator missing contract methods
- ✅
  ```ts
  export class WebLocator implements LocatorLike {
    constructor(readonly locator: Locator) {}
    async getText(): Promise<string> { return this.locator.innerText(); }
    async getValue(): Promise<string> { return this.locator.inputValue(); }
    // ...
  }
  class WebPage implements LocatorRoot<WebLocator> { /* bridges Page */ }
  export class WebUtils extends CoreUtils<WebLocator, WebPage> { ... }
  ```

---

## 29. `AriaRole` is not a named export from `@playwright/test` — infer it from the method signature

**Mistake:** Wrote `import type { Page, Locator, AriaRole } from '@playwright/test'`. TypeScript error: `Module '"@playwright/test"' has no exported member 'AriaRole'`. Playwright exposes `AriaRole` as an internal type used by `getByRole` but does not re-export it as a named type from the package index.

**Rule:** Infer the type from the method signature — same pattern as inferring `HardwareButton` and `SwipeDirection` in `mobile.utils.ts`:
```ts
type AriaRole = Parameters<Page['getByRole']>[0];
```
This always stays in sync with whatever Playwright's `getByRole` actually accepts, requires no import, and fails loudly if Playwright changes the signature.

Also: web does NOT need `aria.types.ts`. Playwright's own type covers all WAI-ARIA roles — it's not a narrow custom union like mobile's (which mirrors a 12-entry internal map). Remove any `aria.types.ts` from `apps/web/utils/`.

**Example:**
- ❌ `import type { AriaRole } from '@playwright/test'` — type error: not exported
- ✅ `type AriaRole = Parameters<Page['getByRole']>[0];` — self-syncing inference, no import needed

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
- ✅ `_dump.spec.ts` calls `await screen.viewTree()` directly with `// dev-only API, deliberately kept out of MobileUtils`

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
- ✅ `grep -A 3 '"label": "Delete Contact"' _dump_output.txt` first — confirm type before changing

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

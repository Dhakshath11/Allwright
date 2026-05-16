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

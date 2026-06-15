---
name: screen-builder
description: Recipe + template for building Allwright screen object (POM) classes from a captured mobilewright view tree. The user does the extraction manually — Claude is consulted only for ambiguous locator decisions or a final review. Use this skill when the user says "build a screen", "build the contacts screen", "create a screen for X", "extract locators for X screen", "scaffold X screen", "make the POM for X", or asks how to structure a screen class.
---

# Screen Builder (manual mode — token-light by design)

The user does the locator extraction themselves. This file is the **recipe + template + conventions reference**. Claude is consulted only on demand for hard calls.

## Step 1 — Capture the view tree (user)

Ensure the platform's snapshots spec — `apps/mobile/sample/snapshots/_snapshots_<platform>.spec.ts` — has a `test()` block that navigates to the target screen state and calls `dump(screen, '<platform>_<state>.json')`. Add or edit blocks as needed.

```bash
npm run test:mobile:snapshots -- --project=<platform>
```

Writes one JSON file per dumped state to `apps/mobile/sample/resources/snapshots/`. Naming convention: `<platform>_<state>.json` (e.g. `android_contacts_list_view.json`, `ios_add_contact_form.json`). Each file is the full view-tree JSON for that single screen — no headers, no labels, no concatenation.

> Snapshot specs live in `sample/snapshots/`, separate from the regression suite in `sample/tests/`. The two configs (`mobilewright.config.ts` and `snapshots.config.ts`) point at different `testDir`s so the suites never overlap.

## Step 2 — Extract locators manually (user)

Open the snapshot file for the screen you're building (e.g. `apps/mobile/sample/resources/snapshots/android_add_contact_form.json`). Scan for elements worth wrapping.

**Keep** — any of:
- `accessibilityIdentifier` set (the gold standard — becomes `getByTestId`)
- `accessibilityLabel` set (becomes `getByLabel`)
- Buttons, text fields, search fields, switches, sliders, links
- Visible text you'll assert on (titles, status messages)

**Skip:**
- OS chrome (status bar, time, battery, signal)
- Layout-only containers (generic `View`/`Group` with no role)
- Hidden / zero-size nodes
- Duplicate cells in a repeating list — keep one representative

**Selector priority** — use the highest available:

| If the node has... | Use |
|---|---|
| `accessibilityIdentifier: "X"` | `this.utils.getByTestId('X')` |
| `accessibilityLabel: "X"` (no identifier) | `this.utils.getByLabel('X')` |
| Clean `role` + visible `name` | `this.utils.getByRole('button', 'X')` |
| Empty field + `placeholder` | `this.utils.getByPlaceholder('X')` |
| Only visible text | `this.utils.getByText('X')` — brittle, last resort |

## Step 3 — Write the screen class (user, from template)

Save at `apps/mobile/sample/screens/<feature>.screen.ts` (e.g. `contacts-list.screen.ts`). Reference shape: `apps/mobile/sample/screens/contacts.screen.ts`.

```ts
import { test } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../utils/mobile.utils';

export class FeatureScreen {
  private readonly utils: MobileUtils;

  // Declare every locator as `private readonly <name>: Locator;`
  private readonly addButton: Locator;
  // private readonly firstName: Locator;
  // ...

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);

    // Initialize every locator via `this.utils.getByX(...)`
    this.addButton = this.utils.getByRole('button', 'Add');
    // this.firstName = this.utils.getByTestId('First name');
    // ...
  }

  // Action method — named-object params, encapsulates the FULL flow.
  // EVERY public method body is wrapped in test.step(...).
  async doSomething({ a, b }: { a: string; b: string }): Promise<void> {
    await test.step(`Do something with ${a} and ${b}`, async () => {
      await this.utils.tap(this.addButton);
      // ... full flow only
    });
  }

  // Optional assertion helper — also wrapped in test.step.
  async expectThingVisible(label: string): Promise<void> {
    await test.step(`Expect "${label}" visible`, async () => {
      await this.utils.expectVisible(this.utils.getByText(label));
    });
  }
}
```

## Conventions (non-negotiable)

- Class name `<Feature>Screen`, exported. One screen state per class.
- Constructor takes mobilewright `Screen`, instantiates `MobileUtils` internally.
- Locators: `private readonly <name>: Locator`.
- All actions and assertions go through `this.utils` — **never** call mobilewright APIs directly.
- Action params: **named-object literals**, never positional.
- Actions encapsulate the **full** user flow (not partial steps).
- **Every public method body wrapped in `test.step(name, async () => {...})`** — actions AND `expect*` helpers. Step name is imperative title-case (`'Tap Add button'`), interpolates dynamic args, never includes the screen name. `allwright-reviewer` flags missing steps as `[Critical]`.
- Filenames: dot-descriptor, kebab in name part — `contacts-list.screen.ts`, `add-contact.screen.ts`.

## When to engage Claude (use sparingly to save tokens)

| Situation | What to paste | What you get back |
|---|---|---|
| Ambiguous selector for one node | The JSON of that single node | One-line recommendation with reason |
| Two locators with the same `accessibilityLabel` | Both node JSONs | Disambiguation strategy (parent scoping, role filter, nth) |
| Stuck on what a node represents | Node JSON + the visual screenshot | Plain-English meaning |
| Final review of the completed file | The full screen class file | Run `allwright-reviewer` over it — catches POM hygiene, weak assertions, prompt-friendliness |

**Avoid** (high token cost, low value):
- Asking Claude to read a full snapshot file (they're 1000+ lines of JSON).
- Asking Claude to enumerate or walk every locator.
- Interactive per-element approval — that's exactly the flow this manual mode replaces.

## After the screen is built

1. Update or write the spec that consumes it.
2. Run `npm run test:mobile` to verify it compiles and runs.
3. Delete the snapshot file you consumed from `apps/mobile/sample/resources/snapshots/`. Delete the `test()` block from `apps/mobile/sample/snapshots/_snapshots_<platform>.spec.ts` if no more screens are queued for that platform; delete the whole file if everything is built.

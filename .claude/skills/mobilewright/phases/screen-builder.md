# Phase 4 — Screen Builder

Goal: read `locator-map.json` → write screen object classes.
Do NOT re-read raw snapshot JSON — the locator map from Phase 3 is the only input.

## Conventions

Read `.claude/skills/screen-builder/SKILL.md` for the full template, selector priority table, and non-negotiable conventions. Apply them exactly.

One addition specific to this phase: off-screen locators flagged `offScreen: true` in the locator map need `swipeUntilVisible` before the tap:

```ts
async tapOffScreenElement(): Promise<void> {
  await test.step('Tap off-screen element', async () => {
    await this.utils.swipeUntilVisible(this.element, { direction: 'up', minSwipes: 1, maxSwipes: 8 });
    await this.utils.tap(this.element);
  });
}
```

## Input

Read `.claude/tasks/mobilewright_locator_map.json`. One screen class per top-level key in the map.

## Output

`apps/mobile/sample/screens/<platform>/<feature>.screen.ts`

After writing each class, remove the corresponding `dump:` capture `test()` block from the snapshot spec — the JSON file is permanent, the spec block is scaffolding.

## State update

```yaml
current_phase: 5
phase_results:
  screen_builder:
    status: done
    pom_files: ["apps/mobile/sample/screens/<platform>/<feature>.screen.ts"]
updated_at: "<ISO-8601>"
```

Write the updated state to `.claude/tasks/mobilewright_state.yaml`.

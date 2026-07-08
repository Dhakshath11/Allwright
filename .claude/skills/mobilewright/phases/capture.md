# Phase 2 — Capture

Read `.claude/skills/mobilewright/commands-ref.md` before running any device or test commands.

Goal: plan the snapshots needed, write self-contained capture blocks, run them, update history.

## 2a — Plan

Check `director_plan.notes` in state for snapshot filenames. If the Director has already listed the snapshots needed (any note containing `.json` filenames), **use that list directly — do not ask the user for confirmation**. The Director's plan is the confirmation.

Only ask the user if the Director's notes contain no snapshot filenames AND `inputs.screens_to_capture` is empty. In that case, propose the list and wait once:

```
Planned captures for <bundleId>:
1. <platform>_<app>_<screen>.json     — <what app state>
2. <platform>_<app>_<screen2>.json    — <what app state>
```

Update state `inputs.screens_to_capture: [filenames]` before proceeding to 2b.

## 2b — Write capture blocks

File: `apps/mobile/sample/snapshots/_snapshots_<platform>.spec.ts`

Every block is fully self-contained — no shared state:

```ts
const BUNDLE_ID = '<bundle-id>';

test('dump: <platform>_<app>_<screen>', async ({ device, screen }) => {
  const utils = new MobileUtils(screen);
  await device.terminateApp(BUNDLE_ID).catch(() => {});
  await device.launchApp(BUNDLE_ID);
  // --- navigation steps ---
  // await utils.tap(utils.getByText('Menu Item'));
  // await utils.swipeUntilVisible(utils.getByTestId('target'), { direction: 'up', minSwipes: 2, maxSwipes: 8 });
  await dump(screen, '<platform>_<app>_<screen>.json');
});
```

Navigation rules:
- `terminateApp` + `launchApp` in EVERY block — no exceptions
- Keyboard auto-focuses? Swipe directly — never tap StaticText to dismiss keyboard
- Off-screen targets: `swipeUntilVisible(locator, { direction: 'up', minSwipes: 1, maxSwipes: 8 })`
- Alert/dialog states: `swipeUntilVisible` to trigger → tap it → dump — all in one block

## 2c — Run captures

```bash
npm run test:mobile:snapshots -- --project=<platform> --grep "<keyword>"
```

Scope `--grep` to the new blocks only — avoids re-running unrelated existing captures.

**Failure triage:**

| Error | Fix |
|---|---|
| `timed out waiting for WebDriverAgent` | Retry once; if persistent, check simulator |
| `no matching element found` before navigation | Remove tap; use `swipeUntilVisible` instead |
| `Element not visible after N swipes` | Use a nearer confirmed element or increase `maxSwipes` |

## 2d — Update snapshot_history.json

Read `apps/mobile/sample/resources/snapshots/snapshot_history.json`. For each new file:
- New key → create array
- Existing key → append to the array

```json
"<platform>_<screen>.json": [{
  "capturedAt": "<ISO-8601>",
  "platform": "<platform>",
  "screen": "<screen-state-name>",
  "triggeredBy": "initial-capture"
}]
```

## State update

```yaml
current_phase: 3
phase_results:
  capture:
    status: done
    snapshots_captured: [list of filenames]
updated_at: "<ISO-8601>"
```

**→ Suggest `/compact` to the user now.** Raw snapshot JSON in context is expensive.

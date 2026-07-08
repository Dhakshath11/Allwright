# Debug Phase

Read `.claude/skills/mobilewright/commands-ref.md` before running any device, app, or test commands.

Goal: diagnose why a test is failing, fix it, and verify the fix. Fully autonomous — only escalate to user if the root cause is irrecoverable.

## Step 1 — Read the spec file

From state: `director_plan.existing_assets.specs[0]` or `phase_results.spec_builder.spec_file`.

Read the spec file and the screen file(s) it imports.

## Step 2 — Run the test and capture output

```bash
npm run test:mobile -- --project=<platform> <spec_file> 2>&1 | tee /tmp/mw_debug_run.txt
cat /tmp/mw_debug_run.txt
```

## Step 3 — Diagnose root cause

Map the error to a cause:

| Error pattern | Root cause | Fix |
|---|---|---|
| `no matching element found` for a locator | Locator stale — UI changed or wrong selector | Re-run locator-analysis (phase 3) + screen-builder (phase 4) |
| `Element not visible after N swipes` | `maxSwipes` too low or wrong scroll direction | Update screen method: increase `maxSwipes` or change direction |
| `timed out waiting for WebDriverAgent` | WDA flaked | Retry once; if persistent, reboot simulator |
| `expect(...).toBeVisible()` failed on `expectAtScreen()` | App not at the expected screen — navigation broke | Check spec launch sequence; ensure `terminateApp` before `launchApp` |
| `Cannot read properties of undefined` | Screen class import path wrong | Fix the import path in the spec |
| App resumed from wrong state | Missing `terminateApp` before `launchApp` | Add terminate step to spec |
| Assertion wrong value | Test data mismatch or wrong element | Update the assertion value or the locator |

## Step 4 — Apply fix

Apply the minimal change that fixes the diagnosed cause. Do not refactor beyond the fix.

If the fix requires new snapshots → update state `current_phase: 2` and set `phases_to_run: [2, 3, 4, 5]`. Let the orchestrator continue from there.

If the fix is in-place (locator string, import path, assertion value) → apply it directly.

## Step 5 — Verify

```bash
npm run test:mobile -- --project=<platform> <spec_file>
```

Must pass green. If it fails again with the same error → try one more diagnostic. If it fails a third time → write the error to `errors[]` in state and escalate: "I've diagnosed and tried two fixes. The test still fails at: [error]. I need your input."

## Step 6 — State update

```yaml
current_phase: 7   # proceed to cleanup if standalone debug, or next planned phase
phase_results:
  debug:
    status: done
    root_cause: "<what was wrong>"
    fix_applied: "<what was changed>"
updated_at: "<ISO-8601>"
```

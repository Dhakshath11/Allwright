# Phase 7 — Cleanup

Goal: finalize artifacts, verify history, delete transient files.

## Checklist

**1. Snapshot history** — verify `snapshot_history.json` has an entry for every file in `phase_results.capture.snapshots_captured`:
```bash
cat apps/mobile/sample/resources/snapshot_history.json
```

**2. Capture blocks** — confirm all `dump:` capture `test()` blocks written in Phase 2 have been removed from the snapshot spec. The JSON files are permanent; the spec blocks are scaffolding only.

**3. Snapshot files** — verify every captured `.json` exists on disk:
```bash
ls apps/mobile/sample/resources/snapshots/
```
Never delete snapshot files — they are permanent records.

**4. Final test run** — confirm the spec passes green:
```bash
npm run test:mobile -- --project=<platform> <spec_file>
```

Must pass before declaring done. If it fails, diagnose and fix — do not skip this step.

**5. Delete transient files:**
```bash
rm -f .claude/tasks/mobilewright_locator_map.json
rm -f .claude/tasks/mobilewright_state.yaml
```

## Done

Workflow complete. All files committed to the repo:
- `apps/mobile/sample/resources/snapshots/<platform>_*.json` — permanent snapshots
- `apps/mobile/sample/resources/snapshot_history.json` — updated history
- `apps/mobile/sample/screens/<platform>/<feature>.screen.ts` — screen object(s)
- `apps/mobile/sample/tests/<feature>_<platform>.spec.ts` — test spec

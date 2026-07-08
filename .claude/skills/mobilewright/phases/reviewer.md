# Phase 6 — Reviewer

Goal: quality check all files created this session. Fix all [Critical] and [Major] findings before proceeding.

## What to review

Read the files from state:
- `phase_results.screen_builder.pom_files` — screen objects
- `phase_results.spec_builder.spec_file` — test spec

## Screen object checklist

- [ ] Every public method body wrapped in `test.step` — `[Critical]` if missing
- [ ] Named-object action params `{ param }` not positional — `[Major]`
- [ ] All locator interaction via `this.utils` — `[Major]` if violated
- [ ] `expect(locator).toBeVisible()` directly — no `expect*` wrapper methods — `[Major]`
- [ ] `expectAtScreen()` checks TWO distinct elements unique to this screen — `[Major]` if only one
- [ ] Every declared locator consumed by at least one method
- [ ] Off-screen locators (from locator map) paired with `swipeUntilVisible` — `[Major]`
- [ ] `getByTestId` used wherever the locator map shows `identifier` was available — `[Major]` if downgraded

## Spec checklist

- [ ] `terminateApp` before `launchApp` in test body — `[Major]`
- [ ] No raw `MobileUtils` calls in spec body — `[Major]`
- [ ] Test data that persists between runs is randomized — `[Minor]`
- [ ] Assertions go beyond just `expectAtScreen()` — test actually exercises the described flow — `[Major]`

## Output format

```
REVIEW — <filename>
[Critical] <issue> — Fix: <concrete action>
[Major]    <issue> — Fix: <concrete action>
[Minor]    <issue> — Fix: <concrete action>

Verdict: APPROVE | REQUEST_CHANGES (<N> blocking issues)
```

Fix all `[Critical]` and `[Major]` findings inline before updating state.

## State update

```yaml
current_phase: 7
phase_results:
  reviewer:
    status: done
    verdict: APPROVE
updated_at: "<ISO-8601>"
```

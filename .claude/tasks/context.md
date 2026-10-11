# Session Context

Last-updated: 2026-10-11

## Focus area

Web smart-locator (`apps/web`) — end-to-end coverage of every resolution stage.

## What changed

- `apps/web/sample/tests/web_smart_chromium.spec.ts` now has 8 page-driven tests (serial, chromium):
  1. Preferred locator resolves (renamed from the misleading "fallback" title).
  2. Fallback: `newTodoInputFallback` — preferred misses, placeholder fallback resolves; asserts the `↩️` annotation.
  3. Auto heal: `newTodoInputHealed` — preferred + fallback miss, history heals, tier `auto`, score 1.000.
  4. Review heal: `newTodoInputReview` — same path, tier `review`, score ~0.881.
  5. Fail: `newTodoInputSimilarityFail` — history found but score <0.85; asserts `LocatorActionError` + fail-tier artifact.
  6-8. Three `test.fail()` suggestion-stage tests (unchanged).
- Tier tests assert the `smart-healing-report-<id>` attachment (tier, score, failedCandidates, selectedCandidate) via a `getHealingArtifact` helper, not unit-level scoring.
- Registry gained `newTodoInputFallback`, `newTodoInputReview`, `newTodoInputSimilarityFail`; `TodoListSmartScreen` gained `addTodoViaFallback`, `addTodoViaReviewHeal`, `triggerSimilarityFail`.
- `SMART_LOCATOR_ARCHITECTURE.md` §16/§19 updated to 8 tests with the per-test table.

## Decisions / findings

- Healing only replays **history**; if history is empty or scores <0.85, the suggestion search runs. The suggestion is a hint and is never applied — the action still throws.
- Report annotations: `serial` = describe mode, `fail` = `test.fail()` (expected failure, not the similarity tier), `info` = resolver events. Fill + Enter are two actions, so fallback/heal annotations show twice.
- Direct `scoreCandidateSimilarity` unit-style tests were tried and removed — the user wanted the full web flow.

## Validation

- Full `web_smart_chromium.spec.ts`: 8 passed. ESLint, `npm run lint:registry`, VS Code diagnostics, and `git diff --check` clean.

## Open threads

- Optional: include action + element id in `SmartWebLocator` annotation text so the doubled `info` rows are distinguishable (not implemented).
- `core/utils/` unit-test infrastructure (Vitest) remains deferred.

## Next intended step

Await user direction; likely the annotation-text clarity tweak or standing up `core/` unit tests.

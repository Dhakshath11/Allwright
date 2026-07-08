---
name: mobilewright
description: MANUAL TRIGGER ONLY — invoke with /mobilewright [bundle-id] [ios|android] [intent]. Pure agentic orchestrator — Director plans once, then executes autonomously through all phases without human confirmation.
allowed-tools: Bash(cat:*) Bash(rm:*) Read Write Agent
argument-hint: <bundle-id> [ios|android] "describe what to test or do"
---

# Mobilewright — Pure Agentic Orchestrator

## Required Permissions

The following are pre-approved in `.claude/settings.json` so phase agents run without prompting.
**Do not widen these** — `Bash(npx *)` or `Bash(python3 *)` grants arbitrary code execution.

| Permission | Why |
|---|---|
| `Bash(xcrun simctl list *)` | Preflight: check booted simulator |
| `Bash(xcrun simctl boot *)` | Preflight: boot simulator if needed |
| `Bash(xcrun simctl terminate *)` | Debug/capture: terminate app before relaunch |
| `Bash(xcrun simctl launch *)` | Debug: launch app directly via simctl |
| `Bash(xcrun simctl listapps *)` | Preflight: verify app is installed |
| `Bash(open -a Simulator)` | Preflight: open Simulator.app after boot |
| `Bash(npx mobilewright doctor *)` | Health check |
| `Bash(npx mobilewright devices)` | List all simulators/emulators |
| `Bash(npx mobilewright install *)` | Install/reinstall WDA agent |
| `Bash(npx mobilecli dump *)` | Debug: dump live UI tree |
| `Bash(npx mobilecli screenshot *)` | Debug: take screenshot |
| `Bash(npx mobilecli apps list *)` | List installed apps |
| `Bash(npx mobilecli apps terminate *)` | Terminate app |
| `Bash(npx mobilecli apps launch *)` | Launch app |
| `Bash(npx mobilecli apps install *)` | Install app (.zip/.apk) |
| `Bash(npx mobilecli webview *)` | WebView inspection |
| `Bash(npm run test:mobile -- *)` | Run regression suite or single spec |
| `Bash(npm run test:mobile:snapshots -- *)` | Run locator-discovery captures |
| `Bash(adb devices)` | Android: list connected devices |
| `Bash(adb shell *)` | Android: device shell ops |
| `Bash(tee /tmp/mw_*)` | Capture test output for debug analysis |
| `Write(.claude/tasks/mobilewright_state.yaml)` | Phase agents write state after each phase |

**Still prompts (intentional):** `python3`, file edits to source code, `Write` to anything outside `.claude/tasks/`, `git` mutations.

---

## Step 1 — Read state

```bash
cat .claude/tasks/mobilewright_state.yaml 2>/dev/null || echo "NO_STATE"
```

---

### If NO_STATE — run Director first (phase 0)

Extract from `$ARGUMENTS`:
- Word 1 → Bundle ID. If absent, ask once and wait.
- Word 2 → Platform (default `ios`)
- Remaining words → intent / instruction (e.g. "write a test for Basic UI", "debug failing spec", "fix broken locator", "Run the spec file")

Read `state-schema.md`, write initial state with `current_phase: 0`.

Spawn the Director agent:
```
Agent({
  description: "mobilewright director — plan the workflow",
  prompt: "<full contents of .claude/skills/mobilewright/director.md>

---
bundleId: <bundle-id>
platform: <platform>
user_intent: <intent from arguments or conversation>"
})
```

The Director asks ONE question block, waits for your answer, then writes `director_plan` + `current_phase` into state. The orchestrator resumes from Step 1 once the Director completes.

---

### If state exists — resume

Read `current_phase` and `director_plan.phases_to_run`. Resume from `current_phase` — skip any phases not in `phases_to_run`.

---

## Step 2 — Phase dispatch

Read the phase file for `current_phase`, then spawn its agent:

| current_phase | File |
|---|---|
| 0 | `.claude/skills/mobilewright/director.md` |
| 1 | `.claude/skills/mobilewright/phases/preflight.md` |
| 2 | `.claude/skills/mobilewright/phases/capture.md` |
| 3 | `.claude/skills/mobilewright/phases/locator-analysis.md` |
| 4 | `.claude/skills/mobilewright/phases/screen-builder.md` |
| 5 | `.claude/skills/mobilewright/phases/spec-builder.md` |
| 6 | `.claude/skills/mobilewright/phases/reviewer.md` |
| 7 | `.claude/skills/mobilewright/phases/cleanup.md` |
| debug | `.claude/skills/mobilewright/phases/debug.md` |

```
Agent({
  description: "mobilewright phase <N> — <phase-name>",
  prompt: "<full contents of phase file>

---
Current state:
<full contents of mobilewright_state.yaml>"
})
```

---

## Step 3 — After each phase (autonomous — no human confirmation)

1. Read `mobilewright_state.yaml` — check `phase_results.<phase>.status`

2. **If `done`:**
   - Report: "Phase N complete — [one-sentence outcome]"
   - Advance to the next phase in `director_plan.phases_to_run`
   - **Proceed immediately** — do not ask the user for confirmation

3. **If `failed`:**
   - Spawn a recovery agent once:
     ```
     Agent({
       description: "mobilewright recovery — phase <N>",
       prompt: "<phase file contents>
     
     ---
     This phase previously failed with:
     <errors[] from state>
     
     Diagnose the failure, apply a fix, and retry the phase objective.
     
     Current state:
     <state YAML>"
     })
     ```
   - If recovery succeeds → continue to next phase
   - If recovery also fails → **stop and surface to user:**
     "Phase N failed twice. Error: [error from state]. I need your input to continue."

4. **When all phases in `phases_to_run` are complete:** report "Workflow complete." and run cleanup.

   Then reflect on the run and propose lessons additions if warranted:
   - Did any phase fail and recover? What was the root cause?
   - Did any locator strategy not work and require a switch? Was a snapshot missing a dynamic state?
   - Did any framework behavior (WDA timeout, `launchApp` cold-start, iOS bounds quirk, etc.) cause a retry?

   If any of the above produced an insight NOT already in `lessons.md`, propose it:

   ```
   Proposed addition to lessons.md:

   ## N. <title>
   **Mistake:** <what went wrong>
   **Rule:** <the preventive rule>
   **Example:**
   - ❌ ...
   - ✅ ...
   ```

   Ask: "Should I add this to lessons.md? (yes / no / edit)"
   **Do not write until the user confirms.** `Write(.claude/tasks/lessons.md)` is intentionally not auto-approved — the prompt is the gate.

---

## Why this is pure agentic

- **Director asks once** — all planning happens upfront, no mid-workflow questions
- **No confirmation prompts** — orchestrator auto-advances after every successful phase
- **Autonomous failure recovery** — one retry before escalating to human
- **Isolated context per phase** — raw snapshot JSON in phase 3 never touches the orchestrator context
- **State machine survives everything** — compaction, session breaks, failures all resume cleanly

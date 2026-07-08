# State Schema

File: `.claude/tasks/mobilewright_state.yaml`

```yaml
version: 1
bundleId: ""
platform: ios           # ios | android

# Set by Director (phase 0). Orchestrator reads phases_to_run to know what to execute.
director_plan:
  mode: ""              # write | execute | debug | fix | maintain | refactor
  intent: ""            # plain-English summary of the test goal
  phases_to_run: []     # ordered list of phase numbers the orchestrator will execute
  phases_to_skip: []
  skip_reasons: {}      # { "2": "Snapshots already captured 2026-06-26" }
  token_estimate: ""    # low | medium | high
  graphify_used: false
  existing_assets:
    snapshots: []
    screens: []
    specs: []
  acceptance_criteria: []  # verifiable assertions — used by reviewer phase

# 0=director 1=preflight 2=capture 3=locator-analysis 4=screen-builder
# 5=spec-builder 6=reviewer 7=cleanup  debug=debug-phase
current_phase: 0

phase_results:
  director:
    status: pending     # pending | done | failed
  preflight:
    status: pending
    device: ""
  capture:
    status: pending
    snapshots_captured: []
  locator_analysis:
    status: pending
    locator_map: ".claude/tasks/mobilewright_locator_map.json"
  screen_builder:
    status: pending
    pom_files: []
  spec_builder:
    status: pending
    spec_file: ""
  reviewer:
    status: pending
    verdict: ""         # APPROVE | REQUEST_CHANGES
  debug:
    status: pending
    root_cause: ""
    fix_applied: ""
  cleanup:
    status: pending

errors: []
created_at: ""
updated_at: ""
```

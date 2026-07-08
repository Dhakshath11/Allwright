# Phase 1 — Preflight

Read `.claude/skills/mobilewright/commands-ref.md` before running any device operations.

Goal: verify the simulator/device is ready before any test commands are run.

## iOS

```bash
xcrun simctl list devices | grep Booted
```

If nothing is booted, list available devices first — never hardcode a name:

```bash
xcrun simctl list devices available | grep -E "iPhone|iPad"
```

Pick a device from the output, then boot it:

```bash
xcrun simctl boot "<device-from-list>" && open -a Simulator
```

Wait ~10 seconds, verify:

```bash
xcrun simctl list devices | grep Booted
```

## Android

```bash
adb devices
```

If no device/emulator is listed, ask the user to start one, then re-check.

## State update

```yaml
current_phase: 2
phase_results:
  preflight:
    status: done
    device: "<booted-device-name-or-adb-serial>"
updated_at: "<ISO-8601>"
```

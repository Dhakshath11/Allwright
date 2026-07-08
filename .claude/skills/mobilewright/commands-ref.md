# Mobilewright Commands Reference

Available shell commands for device management, app control, and debug operations.
Read this file before running any device/app/debug operations.

## Device ID (iOS — reuse this pattern everywhere)

```bash
DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1)
```

---

## Device / Simulator

| Goal | Command |
|---|---|
| List all simulators + emulators | `npx mobilewright devices` |
| List booted iOS simulators | `xcrun simctl list devices \| grep Booted` |
| List available iOS devices | `xcrun simctl list devices available \| grep -E "iPhone\|iPad"` |
| Boot iOS simulator | `xcrun simctl boot "<name>" && open -a Simulator` |
| List Android devices | `adb devices` |

---

## WDA / Agent

| Goal | Command |
|---|---|
| Env health check (all) | `npx mobilewright doctor` |
| Env health check (iOS only) | `npx mobilewright doctor --category ios` |
| Env health check (machine-readable) | `npx mobilewright doctor --json` |
| Install WDA on booted device | `npx mobilewright install -d $DEVICE_ID` |
| Force reinstall WDA | `npx mobilewright install -d $DEVICE_ID --force` |

---

## App Management

| Goal | Command |
|---|---|
| List installed apps | `npx mobilecli apps list --device $DEVICE_ID` |
| Launch app | `npx mobilecli apps launch --device $DEVICE_ID <bundle-id>` |
| Terminate app | `npx mobilecli apps terminate --device $DEVICE_ID <bundle-id>` |
| Install app (.zip / .apk) | `npx mobilecli apps install --device $DEVICE_ID <path>` |

---

## Inspection / Debug

| Goal | Command |
|---|---|
| Dump live UI tree | `npx mobilecli dump ui --device $DEVICE_ID > /tmp/mw_uidump.json` |
| Take screenshot | `npx mobilecli screenshot --device $DEVICE_ID -o /tmp/mw_screen.png` |
| List embedded webviews | `npx mobilecli webview list --device $DEVICE_ID` |
| Webview HTML content | `npx mobilecli webview content --device $DEVICE_ID` |
| Webview current URL | `npx mobilecli webview url --device $DEVICE_ID` |

---

## Test Execution

| Goal | Command |
|---|---|
| Full regression suite | `npm run test:mobile -- --project=<ios\|android>` |
| Single spec file | `npm run test:mobile -- --project=<platform> <spec_file>` |
| Snapshot captures (all) | `npm run test:mobile:snapshots -- --project=<ios\|android>` |
| Snapshot captures (scoped) | `npm run test:mobile:snapshots -- --project=<platform> --grep "<keyword>"` |
| Capture output for analysis | `npm run test:mobile -- --project=<platform> <spec> 2>&1 \| tee /tmp/mw_debug_run.txt` |

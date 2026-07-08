---
description: List installed apps on the booted iOS simulator
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli apps*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli apps list --device $DEVICE_ID`

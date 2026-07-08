---
description: Force reinstall the mobilewright device agent (WDA) on the booted iOS simulator
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilewright install*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilewright install -d $DEVICE_ID --force && echo "Agent reinstalled on $DEVICE_ID"`

---
description: List embedded webviews on the booted iOS simulator
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli webview*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli webview list --device $DEVICE_ID`

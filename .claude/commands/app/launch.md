---
description: Launch an app on the booted iOS simulator by bundle ID
argument-hint: "<bundle-id, e.g. com.mobilenext.playground>"
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli apps launch*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli apps launch --device $DEVICE_ID $ARGUMENTS`

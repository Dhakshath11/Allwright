---
description: Terminate an app on the booted iOS simulator by bundle ID
argument-hint: "<bundle-id, e.g. com.mobilenext.playground>"
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli apps terminate*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli apps terminate --device $DEVICE_ID $ARGUMENTS`

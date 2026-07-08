---
description: Take a screenshot from the booted iOS simulator → /tmp/mw_screen.png
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli screenshot*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli screenshot --device $DEVICE_ID -o /tmp/mw_screen.png && echo "Screenshot saved: /tmp/mw_screen.png"`

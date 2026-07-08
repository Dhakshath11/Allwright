---
description: Dump live UI tree from the booted iOS simulator → /tmp/mw_uidump.json
allowed-tools: Bash(xcrun simctl list*), Bash(npx mobilecli dump*)
---

!`DEVICE_ID=$(xcrun simctl list devices | grep -E '\(Booted\)' | grep -oE '[A-F0-9-]{36}' | head -1) && npx mobilecli dump ui --device $DEVICE_ID > /tmp/mw_uidump.json && echo "UI tree saved: /tmp/mw_uidump.json ($(wc -c < /tmp/mw_uidump.json) bytes)"`

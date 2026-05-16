---
description: iOS simulator setup — Xcode version, list devices, boot iPhone 17 Pro Max, open Simulator
allowed-tools: Bash(xcodebuild -version), Bash(xcrun simctl list devices:*), Bash(xcrun simctl boot:*), Bash(open -a Simulator)
---

Xcode version:

!`xcodebuild -version`

Available simulators:

!`xcrun simctl list devices`

Booting target device (ignore "Unable to boot device in current state: Booted" — that means it's already running):

!`xcrun simctl boot "iPhone 17 Pro Max"`

Opening Simulator app:

!`open -a Simulator`

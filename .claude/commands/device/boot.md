---
description: Boot an iOS simulator by name and open Simulator.app
argument-hint: "<simulator name, e.g. iPhone 17 Pro>"
allowed-tools: Bash(xcrun simctl boot*), Bash(open -a Simulator*)
---

!`xcrun simctl boot "$ARGUMENTS" && open -a Simulator`

---
description: Run the Mobilewright test suite (passes any args through)
argument-hint: [mobilewright args, e.g. --grep smoke]
allowed-tools: Bash(npm run test:mobile:*)
---

Run mobilewright tests via the root npm script. Any arguments after the command name are forwarded to mobilewright.

!`npm run test:mobile -- $ARGUMENTS`

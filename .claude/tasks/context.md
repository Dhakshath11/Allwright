# Session Context

Last-updated: 2026-06-21

## Focus area

`MobileUtils` swipe API expansion, iOS/Android notification tests, device API smoke test parity, and swipe coordinate model clarification.

## What we did this session

### MobileUtils swipe API (`apps/mobile/utils/mobile.utils.ts`)

- **`duration` removed** from `swipeUp/Down/Left/Right` and `swipeFromPoint`. `device.io.swipe` silently ignores it (Go server only reads `x1, y1, x2, y2`). If speed control is needed, `gesture()` is the correct path (uses `device.io.gesture` where `pointerMove.duration` is honoured).
- **`swipeFromPoint(direction, { startX, startY, distance? })`** added — exposes the `startX`/`startY` options on `screen.swipe` that the existing directional helpers didn't pass through. Use when the swipe origin matters (notification shade, Control Center, edge back-swipe).
- **`gesture(pointers: GesturePointers)`** added — thin pass-through to `screen.gesture`. `GesturePointers` is inferred from `Parameters<Screen['gesture']>[0]['pointers']`. Mobilewright's gesture type is simple waypoints (`{ x, y, time? }[][]`), not W3C pointer events. **Currently has a known bug — avoid using in tests until resolved.**
- **`openNotifications(screenSize)`** and **`closeNotifications(screenSize)`** added. Both accept `{ width, height }` from `device.screenSize()` (Screen doesn't expose size — only Device does). Compute `startX = round(width * 0.9)`, `distance = round(height * 0.9)`. For close: `startY = round(height * 0.9)`, `distance = startY` so `endY = 0`.

### Coordinate model (confirmed this session)

- `device.screenSize()` returns **logical points** (test device: `{ width: 402, height: 874, scale: 3 }`).
- MobileCLI uses **physical pixels** (`540,0,540,1500` on the same device = 1206×2622 physical).
- `screen.swipe` and `swipeFromPoint` take logical point coordinates — divide CLI pixel values by `scale` to convert.
- iOS swipe origin matters: left-half top → Notification Center, right-half top → Control Center. Current `openNotifications` uses 90% of width (right side) — may open Control Center on Dynamic Island devices; confirm on device.

### iOS spec (`apps/mobile/sample/tests/mobile_ios.spec.ts`)

- Added test: `'long-presses a contact, returns Home, then relaunches Contacts'` — presses HOME, checks Springboard, relaunches Contacts. Contact: `'David Taylor'` (default iOS sample contact).
- Added test: `'opens Notification Center from Contacts and dismisses it'` — uses `openNotifications` / `closeNotifications`, attaches screenshot + foreground check.
- `test.fixme` updated: removed "Notification Center" from the title/TODO (now covered above); remaining fixmes: app-switcher / minimize-reopen, Add Photo screen recording.

### Android spec (`apps/mobile/sample/tests/mobile_android.spec.ts`)

- Added test: `'long-presses a contact, returns Home, then relaunches Contacts'` — contact: `'Michael Bay'` (Android sample contact on this emulator). After HOME, asserts `bundleId !== 'com.google.android.contacts'` (launcher package varies by image, don't pin it).
- Added test: `'opens notification shade from Contacts and dismisses it'` — same `openNotifications`/`closeNotifications` API; attachment label: `notification-shade-open`.

### Device API smoke tests

- `mobile_device_ios.spec.ts` (untracked → now being used as-is) — exercises all `device` methods with iOS bundle IDs. **iOS-specific**: `com.apple.*` constants, `width < 600` guard on `screenSize`, Springboard check after `terminateApp`, Safari for `openUrl`.
- `mobile_device_android.spec.ts` (new file) — Android mirror. Key differences: no Springboard (assert `!== SETTINGS` after `terminateApp`), no `width < 600` guard, Chrome for `openUrl`, `.apk` in the `installApp` fixme. `sleep(600)` added before `getForegroundApp` after `openUrl`/`goto` (Android intent resolution is async).

## Open threads (carried forward)

- **`gesture()` bug** — known, user flagged. Avoid until resolved upstream.
- **`openNotifications` X coordinate** — 90% of width = right side of screen → may open Control Center on Dynamic Island iPhones. Needs device verification to confirm which panel opens.
- **`Locator.clear()` upstream PR** — still missing. Edit tests assume clean pre-state via serial mode.
- **`autoGrantPermissions: true` on `LaunchOptions`** — would delete `global-setup.ts`.
- **`ROLE_TYPE_MAP` export from `@mobilewright/core`** — would collapse `aria.types.ts` to a re-export.
- **`core/utils/` unit tests** — `swipeUntilVisible` is the canonical first candidate.
- **Web surface** — not started.
- **API surface** — not started.
- **CodeQL** — commented out in CI, pending repo Settings → Code scanning → Advanced.

## Next intended step

User's call. Likely:
1. Run the notification test on a live simulator and confirm which panel opens (NC vs CC).
2. Fix or track the `gesture()` bug.
3. First `core/utils/` unit test (`swipeUntilVisible`).

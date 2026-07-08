# Phase 3 — Locator Analysis

Goal: read snapshot JSON files, extract only actionable controls, write `locator-map.json`.
Do NOT keep raw snapshot content in memory after this phase — that's what the map is for.

## Process one snapshot at a time

For each file in `phase_results.capture.snapshots_captured`:

**1. Read the snapshot:**
`apps/mobile/sample/resources/snapshots/<filename>`

Determine platform from the filename prefix: `ios_` → iOS rules, `android_` → Android rules.

---

## iOS nodes

**Include ONLY these `type` values:**
`Button`, `TextField`, `SecureTextField`, `Switch`, `Checkbox`, `Picker`, `Slider`, `Link`, `Tab`, `MenuItem`, `SearchField`

Also include `StaticText` that is a **screen title** or an **assertion target** — flag those with `assertTarget: true`.

**Skip everything else:** Other StaticText, Image, layout containers, status-bar nodes (time/battery/signal), `isVisible: false`, `width: 0` or `height: 0`.

**iOS locator priority:**

| Node has… | Locator |
|---|---|
| `accessibilityIdentifier` set | `getByTestId('id')` ← always prefer |
| `accessibilityLabel` only | `getByLabel('label')` |
| role + visible name | `getByRole('button', 'name')` |
| `placeholder` | `getByPlaceholder('hint')` |
| only visible text | `getByText('text')` ← last resort |

**iOS off-screen quirk:**
`isVisible: true` + `bounds: {x:0, y:0, width:0, height:0}` = off-screen placeholder.
Flag these with `offScreen: true` — they need `swipeUntilVisible` before interaction.

---

## Android nodes

**Step 1 — Skip OS chrome first (entire subtree):**
Any node whose `identifier` starts with `com.android.systemui:` is OS chrome. Skip it and all its children entirely. Do not walk into it.

This covers: status bar, clock, battery, signal icons, notification area.

**Step 2 — Include ONLY these `type` values (from app content):**

| Android type | Maps to |
|---|---|
| `android.widget.EditText` | text input field |
| `android.widget.Button` | button |
| `android.widget.ImageButton` | icon button |
| `android.widget.CheckBox` | checkbox |
| `android.widget.Switch` | toggle |
| `android.widget.RadioButton` | radio option |
| `android.widget.Spinner` | dropdown picker |
| `android.widget.SearchView` | search input |
| `android.view.View` with `label` set | tappable element (Android uses this for buttons, icons, actions) |
| `android.widget.TextView` that is a **screen title** or **assertion target** | include with `assertTarget: true` |

**Skip:**
- `android.widget.FrameLayout`, `android.widget.LinearLayout` — pure layout containers
- `android.widget.ImageView` — decorative images
- `android.view.View` **without** a `label` — not interactable
- `android.widget.TextView` that is plain body text (not a screen title)
- Any node with `isVisible: false`, `width: 0`, or `height: 0`

**Step 3 — Android locator priority:**

| Node has… | Locator |
|---|---|
| `identifier` starting with app package (e.g. `com.google.android.contacts:id/first_name`) | `getByTestId('identifier')` — use the full string |
| `label` set (and no useful identifier) | `getByLabel('label')` ← most common on Android |
| `android.widget.EditText` with hint `text` | `getByPlaceholder('text')` — the `text` field IS the hint when empty |
| `android.widget.TextView` visible text | `getByText('text')` ← last resort |

> **Android identifier note:** Android identifiers are resource IDs (e.g. `com.google.android.contacts:id/edit_name`). Use `getByTestId` with the full string only when the ID looks semantic (not generic like `android:id/content`). If the identifier is generic or absent, fall back to `getByLabel` or `getByPlaceholder`.

**Android has no off-screen quirk:** Off-screen elements are absent from the Android view tree entirely (unlike iOS which reports them with zero bounds). No `offScreen` flagging needed for Android.

## Output format

Write to `.claude/tasks/mobilewright_locator_map.json`:

```json
{
  "<screen_key>": {
    "<camelCaseName>": {
      "locator": "getByTestId('id')",
      "type": "Button",
      "offScreen": false
    },
    "<titleName>": {
      "locator": "getByTestId('screen_title')",
      "type": "StaticText",
      "assertTarget": true
    }
  }
}
```

Screen key naming: `<platform>_<app>_<screen>` matching the snapshot filename (without `.json`).

## State update

```yaml
current_phase: 4
phase_results:
  locator_analysis:
    status: done
    locator_map: ".claude/tasks/mobilewright_locator_map.json"
updated_at: "<ISO-8601>"
```

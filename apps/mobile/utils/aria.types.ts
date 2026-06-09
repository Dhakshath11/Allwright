/**
 * ARIA roles supported by mobilewright's `getByRole`, shared across iOS
 * and Android. Every value below corresponds to an entry in mobilewright's
 * internal `ROLE_TYPE_MAP` (`@mobilewright/core/dist/query-engine.js`),
 * which maps each role to the concrete native view types it matches.
 *
 * Anything not in this union is silently unmatched at runtime — mobilewright
 * falls back to a literal type comparison that virtually never resolves.
 * That mismatch between "what the type allows" and "what the engine matches"
 * was the source of a class of flaky tests on the iOS surface, so this
 * union is deliberately narrow and authoritative.
 *
 * When the web surface lands, `apps/web/utils/aria.types.ts` will declare
 * its own `AriaRole` covering the broader WAI-ARIA web set (link, heading,
 * cell, row, dialog, tab, tabpanel, etc.).
 */
export type AriaRole =
  | 'button'     // iOS Button; Android Button / ImageButton
  | 'textfield'  // iOS TextField / SecureTextField / SearchField; Android EditText
  | 'text'       // iOS StaticText; Android TextView
  | 'image'      // iOS Image; Android ImageView
  | 'switch'     // iOS Switch; Android Switch / Toggle
  | 'checkbox'   // iOS Checkbox; Android Checkbox
  | 'slider'     // iOS Slider; Android SeekBar
  | 'list'       // iOS Table / CollectionView; Android RecyclerView / ListView / ScrollView
  | 'listitem'   // iOS Cell; Android LinearLayout / RelativeLayout (heuristic)
  | 'tab'        // iOS TabBar; Android Tab
  | 'link'       // hyperlink-style elements
  | 'header';    // iOS NavigationBar; Android Toolbar / Header

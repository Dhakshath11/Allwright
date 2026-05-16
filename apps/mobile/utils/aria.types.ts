/**
 * ARIA roles supported by mobilewright's `getByRole`. This is the mobile
 * surface's role union — kept narrow because iOS/Android expose a smaller
 * set than the WAI-ARIA roles a web surface (Playwright) would accept.
 *
 * When the web surface lands, `apps/web/utils/aria.types.ts` will declare
 * its own `AriaRole` covering the broader web role set (link, heading,
 * cell, row, dialog, tab, tabpanel, etc.).
 */
export type AriaRole =
  | 'button'
  | 'textbox'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'textarea'
  | 'listbox'
  | 'menu'
  | 'menuitem'
  | 'option'
  | 'progressbar'
  | 'scrollbar'
  | 'searchbox'
  | 'separator'
  | 'slider';

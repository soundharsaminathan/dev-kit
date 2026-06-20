/**
 * Standard viewport matrix for visual regression.
 *
 * - desktop — primary Storybook canvas; all tests run here.
 * - tablet — catches wrapping, nav collapse, and spacing shifts.
 * - mobile — catches overflow, touch targets, and overlay sizing.
 */
export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/** Grep target for tablet/mobile Playwright projects. */
export const RESPONSIVE_TAG = "@responsive";

/** Pass as the second argument to `test.describe` for multi-viewport coverage. */
export const responsiveDescribeOptions = { tag: RESPONSIVE_TAG };

/**
 * Components whose layout or overlays can break across breakpoints.
 * Visual regression (and layout suites) for these are tagged `@responsive`.
 */
export const RESPONSIVE_COMPONENTS = [
  "accordion",
  "breadcrumbs",
  "combobox",
  "context-menu",
  "dialog",
  "disclosure",
  "drawer",
  "menu",
  "modal",
  "pagination",
  "scroll-fade",
  "select",
  "table",
  "tabs",
  "themes",
  "toast",
  "tooltip",
  "tree",
] as const;

/**
 * Components tested at desktop only — fixed-size primitives with no
 * breakpoint-dependent layout.
 */
export const DESKTOP_ONLY_COMPONENTS = [
  "alert",
  "avatar",
  "badge",
  "button",
  "card",
  "checkbox",
  "checkbox-group",
  "drop-zone",
  "empty",
  "field",
  "file-trigger",
  "group",
  "heading",
  "input",
  "input-group",
  "kbd",
  "link",
  "list-box",
  "loader",
  "number-field",
  "otp-field",
  "progress-bar",
  "radio-group",
  "search-field",
  "separator",
  "skeleton",
  "slider",
  "switch",
  "tag-group",
  "text",
  "text-area",
  "text-field",
  "toggle-button",
  "toggle-button-group",
] as const;

import type { VisualInteraction } from "@/registry/types";

export const COMPONENT_VISUAL_INTERACTIONS = {
  accordion: "accordion-open",
  autocomplete: "autocomplete-open",
  combobox: "combobox-open",
  "color-picker": "color-picker-open",
  "context-menu": "context-menu-open",
  "date-picker": "date-picker-open",
  "date-range-picker": "date-range-picker-open",
  dialog: "dialog-open",
  disclosure: "disclosure-open",
  drawer: "drawer-open",
  menu: "menu-open",
  modal: "modal-open",
  overlay: "overlay-open",
  popover: "popover-open",
  select: "select-open",
  sidebar: "sidebar-open",
  toast: "toast-open",
  tooltip: "tooltip-open",
  tree: "tree-expand",
} as const satisfies Record<string, VisualInteraction>;

export type ComponentVisualInteractionSlug =
  keyof typeof COMPONENT_VISUAL_INTERACTIONS;

export function getComponentVisualInteraction(
  slug: string,
): VisualInteraction | undefined {
  return COMPONENT_VISUAL_INTERACTIONS[slug as ComponentVisualInteractionSlug];
}

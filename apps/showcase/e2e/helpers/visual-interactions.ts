import type { Page } from "@playwright/test";
import type { VisualInteraction } from "../../src/registry/types";
import {
  expandTree,
  openAccordion,
  openAutocomplete,
  openColorPicker,
  openCombobox,
  openContextMenu,
  openDatePicker,
  openDateRangePicker,
  openDialog,
  openDisclosure,
  openDrawer,
  openMenu,
  openModal,
  openOverlay,
  openPopover,
  openSelect,
  openSidebar,
  openTooltip,
  showToast,
} from "./interactions";

const INTERACTIONS: Record<VisualInteraction, (page: Page) => Promise<void>> = {
  "accordion-open": openAccordion,
  "autocomplete-open": openAutocomplete,
  "color-picker-open": openColorPicker,
  "combobox-open": openCombobox,
  "context-menu-open": openContextMenu,
  "date-picker-open": openDatePicker,
  "date-range-picker-open": openDateRangePicker,
  "dialog-open": openDialog,
  "disclosure-open": openDisclosure,
  "drawer-open": openDrawer,
  "menu-open": openMenu,
  "modal-open": openModal,
  "overlay-open": openOverlay,
  "popover-open": openPopover,
  "select-open": openSelect,
  "sidebar-open": openSidebar,
  "toast-open": showToast,
  "tooltip-open": openTooltip,
  "tree-expand": expandTree,
};

export async function runVisualInteraction(
  page: Page,
  interaction: VisualInteraction,
) {
  await INTERACTIONS[interaction](page);
}

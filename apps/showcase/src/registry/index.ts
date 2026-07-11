import { type ComponentType, lazy } from "react";
import { accordionConfig } from "./accordion/config";
import { alertConfig } from "./alert/config";
import { autocompleteConfig } from "./autocomplete/config";
import { avatarConfig } from "./avatar/config";
import { badgeConfig } from "./badge/config";
import { breadcrumbsConfig } from "./breadcrumbs/config";
import { buttonConfig } from "./button/config";
import { calendarConfig } from "./calendar/config";
import { cardConfig } from "./card/config";
import { checkboxConfig } from "./checkbox/config";
import { checkboxGroupConfig } from "./checkbox-group/config";
import { colorAreaConfig } from "./color-area/config";
import { colorEditorConfig } from "./color-editor/config";
import { colorFieldConfig } from "./color-field/config";
import { colorPickerConfig } from "./color-picker/config";
import { colorSliderConfig } from "./color-slider/config";
import { colorSwatchConfig } from "./color-swatch/config";
import { colorSwatchPickerConfig } from "./color-swatch-picker/config";
import { colorThumbConfig } from "./color-thumb/config";
import { colorWheelConfig } from "./color-wheel/config";
import { comboboxConfig } from "./combobox/config";
import { contextMenuConfig } from "./context-menu/config";
import { dateFieldConfig } from "./date-field/config";
import { datePickerConfig } from "./date-picker/config";
import { dateRangePickerConfig } from "./date-range-picker/config";
import { dialogConfig } from "./dialog/config";
import { disclosureConfig } from "./disclosure/config";
import { dragAndDropConfig } from "./drag-and-drop/config";
import { drawerConfig } from "./drawer/config";
import { dropZoneConfig } from "./drop-zone/config";
import { emptyConfig } from "./empty/config";
import { fieldConfig } from "./field/config";
import { fileTriggerConfig } from "./file-trigger/config";
import { formConfig } from "./form/config";
import { gridListConfig } from "./grid-list/config";
import { groupConfig } from "./group/config";
import { headingConfig } from "./heading/config";
import { inputConfig } from "./input/config";
import { inputGroupConfig } from "./input-group/config";
import { kbdConfig } from "./kbd/config";
import { keyboardConfig } from "./keyboard/config";
import { linkConfig } from "./link/config";
import { listBoxConfig } from "./list-box/config";
import { loaderConfig } from "./loader/config";
import { menuConfig } from "./menu/config";
import { meterConfig } from "./meter/config";
import { modalConfig } from "./modal/config";
import { numberFieldConfig } from "./number-field/config";
import { otpFieldConfig } from "./otp-field/config";
import { overlayConfig } from "./overlay/config";
import { overlayArrowConfig } from "./overlay-arrow/config";
import { paginationConfig } from "./pagination/config";
import { popoverConfig } from "./popover/config";
import { progressBarConfig } from "./progress-bar/config";
import { radioGroupConfig } from "./radio-group/config";
import { scrollFadeConfig } from "./scroll-fade/config";
import { searchFieldConfig } from "./search-field/config";
import { selectConfig } from "./select/config";
import { separatorConfig } from "./separator/config";
import { sidebarConfig } from "./sidebar/config";
import { skeletonConfig } from "./skeleton/config";
import { sliderConfig } from "./slider/config";
import { switchConfig } from "./switch/config";
import { tableConfig } from "./table/config";
import { tabsConfig } from "./tabs/config";
import { tagGroupConfig } from "./tag-group/config";
import { textConfig } from "./text/config";
import { textAreaConfig } from "./text-area/config";
import { textFieldConfig } from "./text-field/config";
import { timeFieldConfig } from "./time-field/config";
import { toastConfig } from "./toast/config";
import { toggleButtonConfig } from "./toggle-button/config";
import { toggleButtonGroupConfig } from "./toggle-button-group/config";
import { toolbarConfig } from "./toolbar/config";
import { tooltipConfig } from "./tooltip/config";
import { treeConfig } from "./tree/config";
import type { ComponentRegistryEntry, ComponentSlug } from "./types";
import { virtualizerConfig } from "./virtualizer/config";

function playground(
  loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>,
) {
  return lazy(loader);
}

const registry = {
  accordion: {
    config: accordionConfig,
    Playground: playground(() => import("./accordion/playground")),
  },
  alert: {
    config: alertConfig,
    Playground: playground(() => import("./alert/playground")),
  },
  autocomplete: {
    config: autocompleteConfig,
    Playground: playground(() => import("./autocomplete/playground")),
  },
  avatar: {
    config: avatarConfig,
    Playground: playground(() => import("./avatar/playground")),
  },
  badge: {
    config: badgeConfig,
    Playground: playground(() => import("./badge/playground")),
  },
  breadcrumbs: {
    config: breadcrumbsConfig,
    Playground: playground(() => import("./breadcrumbs/playground")),
  },
  button: {
    config: buttonConfig,
    Playground: playground(() => import("./button/playground")),
  },
  calendar: {
    config: calendarConfig,
    Playground: playground(() => import("./calendar/playground")),
  },
  card: {
    config: cardConfig,
    Playground: playground(() => import("./card/playground")),
  },
  checkbox: {
    config: checkboxConfig,
    Playground: playground(() => import("./checkbox/playground")),
  },
  "checkbox-group": {
    config: checkboxGroupConfig,
    Playground: playground(() => import("./checkbox-group/playground")),
  },
  "color-area": {
    config: colorAreaConfig,
    Playground: playground(() => import("./color-area/playground")),
  },
  "color-editor": {
    config: colorEditorConfig,
    Playground: playground(() => import("./color-editor/playground")),
  },
  "color-field": {
    config: colorFieldConfig,
    Playground: playground(() => import("./color-field/playground")),
  },
  "color-picker": {
    config: colorPickerConfig,
    Playground: playground(() => import("./color-picker/playground")),
  },
  "color-slider": {
    config: colorSliderConfig,
    Playground: playground(() => import("./color-slider/playground")),
  },
  "color-swatch": {
    config: colorSwatchConfig,
    Playground: playground(() => import("./color-swatch/playground")),
  },
  "color-swatch-picker": {
    config: colorSwatchPickerConfig,
    Playground: playground(() => import("./color-swatch-picker/playground")),
  },
  "color-thumb": {
    config: colorThumbConfig,
    Playground: playground(() => import("./color-thumb/playground")),
  },
  "color-wheel": {
    config: colorWheelConfig,
    Playground: playground(() => import("./color-wheel/playground")),
  },
  combobox: {
    config: comboboxConfig,
    Playground: playground(() => import("./combobox/playground")),
  },
  "context-menu": {
    config: contextMenuConfig,
    Playground: playground(() => import("./context-menu/playground")),
  },
  "date-field": {
    config: dateFieldConfig,
    Playground: playground(() => import("./date-field/playground")),
  },
  "date-picker": {
    config: datePickerConfig,
    Playground: playground(() => import("./date-picker/playground")),
  },
  "date-range-picker": {
    config: dateRangePickerConfig,
    Playground: playground(() => import("./date-range-picker/playground")),
  },
  dialog: {
    config: dialogConfig,
    Playground: playground(() => import("./dialog/playground")),
  },
  disclosure: {
    config: disclosureConfig,
    Playground: playground(() => import("./disclosure/playground")),
  },
  "drag-and-drop": {
    config: dragAndDropConfig,
    Playground: playground(() => import("./drag-and-drop/playground")),
  },
  drawer: {
    config: drawerConfig,
    Playground: playground(() => import("./drawer/playground")),
  },
  "drop-zone": {
    config: dropZoneConfig,
    Playground: playground(() => import("./drop-zone/playground")),
  },
  empty: {
    config: emptyConfig,
    Playground: playground(() => import("./empty/playground")),
  },
  field: {
    config: fieldConfig,
    Playground: playground(() => import("./field/playground")),
  },
  "file-trigger": {
    config: fileTriggerConfig,
    Playground: playground(() => import("./file-trigger/playground")),
  },
  form: {
    config: formConfig,
    Playground: playground(() => import("./form/playground")),
  },
  "grid-list": {
    config: gridListConfig,
    Playground: playground(() => import("./grid-list/playground")),
  },
  group: {
    config: groupConfig,
    Playground: playground(() => import("./group/playground")),
  },
  heading: {
    config: headingConfig,
    Playground: playground(() => import("./heading/playground")),
  },
  input: {
    config: inputConfig,
    Playground: playground(() => import("./input/playground")),
  },
  "input-group": {
    config: inputGroupConfig,
    Playground: playground(() => import("./input-group/playground")),
  },
  kbd: {
    config: kbdConfig,
    Playground: playground(() => import("./kbd/playground")),
  },
  keyboard: {
    config: keyboardConfig,
    Playground: playground(() => import("./keyboard/playground")),
  },
  link: {
    config: linkConfig,
    Playground: playground(() => import("./link/playground")),
  },
  "list-box": {
    config: listBoxConfig,
    Playground: playground(() => import("./list-box/playground")),
  },
  loader: {
    config: loaderConfig,
    Playground: playground(() => import("./loader/playground")),
  },
  menu: {
    config: menuConfig,
    Playground: playground(() => import("./menu/playground")),
  },
  meter: {
    config: meterConfig,
    Playground: playground(() => import("./meter/playground")),
  },
  modal: {
    config: modalConfig,
    Playground: playground(() => import("./modal/playground")),
  },
  "number-field": {
    config: numberFieldConfig,
    Playground: playground(() => import("./number-field/playground")),
  },
  "otp-field": {
    config: otpFieldConfig,
    Playground: playground(() => import("./otp-field/playground")),
  },
  overlay: {
    config: overlayConfig,
    Playground: playground(() => import("./overlay/playground")),
  },
  "overlay-arrow": {
    config: overlayArrowConfig,
    Playground: playground(() => import("./overlay-arrow/playground")),
  },
  pagination: {
    config: paginationConfig,
    Playground: playground(() => import("./pagination/playground")),
  },
  popover: {
    config: popoverConfig,
    Playground: playground(() => import("./popover/playground")),
  },
  "progress-bar": {
    config: progressBarConfig,
    Playground: playground(() => import("./progress-bar/playground")),
  },
  "radio-group": {
    config: radioGroupConfig,
    Playground: playground(() => import("./radio-group/playground")),
  },
  "scroll-fade": {
    config: scrollFadeConfig,
    Playground: playground(() => import("./scroll-fade/playground")),
  },
  "search-field": {
    config: searchFieldConfig,
    Playground: playground(() => import("./search-field/playground")),
  },
  select: {
    config: selectConfig,
    Playground: playground(() => import("./select/playground")),
  },
  separator: {
    config: separatorConfig,
    Playground: playground(() => import("./separator/playground")),
  },
  sidebar: {
    config: sidebarConfig,
    Playground: playground(() => import("./sidebar/playground")),
  },
  skeleton: {
    config: skeletonConfig,
    Playground: playground(() => import("./skeleton/playground")),
  },
  slider: {
    config: sliderConfig,
    Playground: playground(() => import("./slider/playground")),
  },
  switch: {
    config: switchConfig,
    Playground: playground(() => import("./switch/playground")),
  },
  table: {
    config: tableConfig,
    Playground: playground(() => import("./table/playground")),
  },
  tabs: {
    config: tabsConfig,
    Playground: playground(() => import("./tabs/playground")),
  },
  "tag-group": {
    config: tagGroupConfig,
    Playground: playground(() => import("./tag-group/playground")),
  },
  text: {
    config: textConfig,
    Playground: playground(() => import("./text/playground")),
  },
  "text-area": {
    config: textAreaConfig,
    Playground: playground(() => import("./text-area/playground")),
  },
  "text-field": {
    config: textFieldConfig,
    Playground: playground(() => import("./text-field/playground")),
  },
  "time-field": {
    config: timeFieldConfig,
    Playground: playground(() => import("./time-field/playground")),
  },
  toast: {
    config: toastConfig,
    Playground: playground(() => import("./toast/playground")),
  },
  "toggle-button": {
    config: toggleButtonConfig,
    Playground: playground(() => import("./toggle-button/playground")),
  },
  "toggle-button-group": {
    config: toggleButtonGroupConfig,
    Playground: playground(() => import("./toggle-button-group/playground")),
  },
  toolbar: {
    config: toolbarConfig,
    Playground: playground(() => import("./toolbar/playground")),
  },
  tooltip: {
    config: tooltipConfig,
    Playground: playground(() => import("./tooltip/playground")),
  },
  tree: {
    config: treeConfig,
    Playground: playground(() => import("./tree/playground")),
  },
  virtualizer: {
    config: virtualizerConfig,
    Playground: playground(() => import("./virtualizer/playground")),
  },
} as const satisfies Record<string, ComponentRegistryEntry>;

export function getRegistryEntry(
  slug: ComponentSlug,
): ComponentRegistryEntry | null {
  return registry[slug as keyof typeof registry] ?? null;
}

export function getAllRegistryEntries(): ComponentRegistryEntry[] {
  return Object.values(registry);
}

export { registry };

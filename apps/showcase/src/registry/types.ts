import type { ComponentType } from "react";
import type {
  ControlValues,
  SerializableControl,
} from "@/modules/showcase/types";

export type NormalizeControlValues = (values: ControlValues) => ControlValues;

export type VisualInteraction =
  | "accordion-open"
  | "autocomplete-open"
  | "color-picker-open"
  | "combobox-open"
  | "context-menu-open"
  | "date-picker-open"
  | "date-range-picker-open"
  | "dialog-open"
  | "disclosure-open"
  | "drawer-open"
  | "menu-open"
  | "modal-open"
  | "overlay-open"
  | "popover-open"
  | "select-open"
  | "sidebar-open"
  | "toast-open"
  | "tooltip-open"
  | "tree-expand";

export interface ExtraVisualCase {
  caseId: string;
  values?: ControlValues;
  interaction?: VisualInteraction;
}

export interface ComponentRegistryConfig {
  name: string;
  slug: string;
  category: string;
  description: string;
  controls: SerializableControl[];
  scale?: number;
  normalizeControlValues?: NormalizeControlValues;
  extraVisualCases?: ExtraVisualCase[];
}

export interface ComponentRegistryEntry {
  config: ComponentRegistryConfig;
  Playground: ComponentType<Record<string, unknown>>;
}

export type ComponentSlug = string;

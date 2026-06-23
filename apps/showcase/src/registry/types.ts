import type { ComponentType } from "react";
import type {
  ControlValues,
  SerializableControl,
} from "@/modules/showcase/types";

export type NormalizeControlValues = (values: ControlValues) => ControlValues;

export interface ComponentRegistryConfig {
  name: string;
  slug: string;
  category: string;
  description: string;
  controls: SerializableControl[];
  scale?: number;
  normalizeControlValues?: NormalizeControlValues;
}

export interface ComponentRegistryEntry {
  config: ComponentRegistryConfig;
  Playground: ComponentType<Record<string, unknown>>;
}

export type ComponentSlug = string;

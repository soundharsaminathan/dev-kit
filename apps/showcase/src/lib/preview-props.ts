import { defaultControlValues } from "@/modules/showcase/types";
import type { ComponentRegistryConfig } from "@/registry/types";

export function getCardPreviewProps(
  config: ComponentRegistryConfig,
): Record<string, unknown> {
  let values = defaultControlValues(config.controls);

  if (config.controls.some((control) => control.name === "defaultOpen")) {
    values.defaultOpen = false;
  }

  if (config.normalizeControlValues) {
    values = config.normalizeControlValues(values);
  }

  return values;
}

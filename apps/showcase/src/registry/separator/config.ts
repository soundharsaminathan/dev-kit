import type { ComponentRegistryConfig } from "../types";

export const separatorConfig: ComponentRegistryConfig = {
  name: "Separator",
  slug: "separator",
  category: "typography",
  description: "Separator component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Separator" }],
};

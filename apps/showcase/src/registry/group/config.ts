import type { ComponentRegistryConfig } from "../types";

export const groupConfig: ComponentRegistryConfig = {
  name: "Group",
  slug: "group",
  category: "buttons",
  description: "Group component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Group" }],
};

import type { ComponentRegistryConfig } from "../types";

export const listBoxConfig: ComponentRegistryConfig = {
  name: "List Box",
  slug: "list-box",
  category: "overlays",
  description: "List Box component showcase.",
  controls: [{ name: "aria-label", type: "string", defaultValue: "Countries" }],
};

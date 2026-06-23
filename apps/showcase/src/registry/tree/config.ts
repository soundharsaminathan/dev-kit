import type { ComponentRegistryConfig } from "../types";

export const treeConfig: ComponentRegistryConfig = {
  name: "Tree",
  slug: "tree",
  category: "layout",
  description: "Tree component showcase.",
  controls: [{ name: "aria-label", type: "string", defaultValue: "Files" }],
};

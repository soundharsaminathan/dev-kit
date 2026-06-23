import type { ComponentRegistryConfig } from "../types";

export const skeletonConfig: ComponentRegistryConfig = {
  name: "Skeleton",
  slug: "skeleton",
  category: "typography",
  description: "Skeleton component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Skeleton" }],
};

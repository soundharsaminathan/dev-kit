import type { ComponentRegistryConfig } from "../types";

export const skeletonConfig: ComponentRegistryConfig = {
  name: "Skeleton",
  slug: "skeleton",
  category: "typography",
  description: "Skeleton component showcase.",
  controls: [
    { name: "animation", type: "enum", options: ["shimmer", "pulse", "none"] },
    { name: "isLoading", type: "boolean" },
    { name: "variant", type: "enum", options: ["placeholder", "content"] },
  ],
};

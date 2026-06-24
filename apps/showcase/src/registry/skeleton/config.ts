import type { ComponentRegistryConfig } from "../types";

export const skeletonConfig: ComponentRegistryConfig = {
  name: "Skeleton",
  slug: "skeleton",
  category: "typography",
  description: "Skeleton component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["placeholder", "content"],
      defaultValue: "content",
    },
    { name: "isLoading", type: "boolean", defaultValue: true },
    {
      name: "animation",
      type: "enum",
      options: ["shimmer", "pulse", "none"],
      defaultValue: "shimmer",
    },
  ],
};

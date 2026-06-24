import type { ComponentRegistryConfig } from "../types";

export const loaderConfig: ComponentRegistryConfig = {
  name: "Loader",
  slug: "loader",
  category: "typography",
  description: "Loader component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Loader" }],
};

import type { ComponentRegistryConfig } from "../types";

export const loaderConfig: ComponentRegistryConfig = {
  name: "Loader",
  slug: "loader",
  category: "typography",
  description: "Loader component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["spinner", "ring"],
      defaultValue: "spinner",
    },
  ],
};

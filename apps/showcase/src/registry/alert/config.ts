import type { ComponentRegistryConfig } from "../types";

export const alertConfig: ComponentRegistryConfig = {
  name: "Alert",
  slug: "alert",
  category: "layout",
  description: "Alert component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["neutral", "danger", "warning", "info", "success"],
      defaultValue: "neutral",
    },
  ],
};

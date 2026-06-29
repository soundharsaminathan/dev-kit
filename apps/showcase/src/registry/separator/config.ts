import type { ComponentRegistryConfig } from "../types";

export const separatorConfig: ComponentRegistryConfig = {
  name: "Separator",
  slug: "separator",
  category: "typography",
  description: "Separator component showcase.",
  controls: [
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
  ],
};

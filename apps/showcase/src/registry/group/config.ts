import type { ComponentRegistryConfig } from "../types";

export const groupConfig: ComponentRegistryConfig = {
  name: "Group",
  slug: "group",
  category: "buttons",
  description: "Group component showcase.",
  controls: [
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    { name: "showPrefixText", type: "boolean", defaultValue: false },
    { name: "prefixText", type: "string", defaultValue: "Prefix" },
  ],
};

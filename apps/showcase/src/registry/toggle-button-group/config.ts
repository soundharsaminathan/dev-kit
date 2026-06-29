import type { ComponentRegistryConfig } from "../types";

export const toggleButtonGroupConfig: ComponentRegistryConfig = {
  name: "Toggle Button Group",
  slug: "toggle-button-group",
  category: "buttons",
  description: "Toggle Button Group component showcase.",
  controls: [
    {
      name: "selectionMode",
      type: "enum",
      options: ["single", "multiple"],
      defaultValue: "single",
    },
    {
      name: "variant",
      type: "enum",
      options: ["default", "primary", "quiet"],
      defaultValue: "default",
    },
    {
      name: "size",
      type: "enum",
      options: ["xs", "sm", "md", "lg"],
      defaultValue: "md",
    },
    {
      name: "orientation",
      type: "enum",
      options: ["horizontal", "vertical"],
      defaultValue: "horizontal",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "disallowEmptySelection", type: "boolean", defaultValue: false },
  ],
};

import type { ComponentRegistryConfig } from "../types";

export const selectConfig: ComponentRegistryConfig = {
  name: "Select",
  slug: "select",
  category: "overlays",
  description: "Choose one option from a list.",
  scale: 0.9,
  controls: [
    { name: "placeholder", type: "string", defaultValue: "Select a provider" },
    { name: "label", type: "string", defaultValue: "Provider" },
    { name: "description", type: "string", defaultValue: "" },
    { name: "errorMessage", type: "string", defaultValue: "" },
    {
      name: "labelMode",
      type: "enum",
      options: ["prop", "element"],
      defaultValue: "element",
    },
    {
      name: "defaultSelectedKey",
      type: "enum",
      options: ["none", "perplexity", "replicate", "together-ai"],
      defaultValue: "none",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
  ],
};

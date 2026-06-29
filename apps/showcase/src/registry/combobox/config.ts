import type { ComponentRegistryConfig } from "../types";

export const comboboxConfig: ComponentRegistryConfig = {
  name: "Combobox",
  slug: "combobox",
  category: "overlays",
  description: "Combobox component showcase.",
  controls: [
    { name: "ariaLabel", type: "string", defaultValue: "Country" },
    {
      name: "placeholder",
      type: "string",
      defaultValue: "Select a country...",
    },
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isRequired", type: "boolean", defaultValue: false },
    { name: "isInvalid", type: "boolean", defaultValue: false },
    {
      name: "menuTrigger",
      type: "enum",
      options: ["focus", "input", "manual"],
      defaultValue: "focus",
    },
    {
      name: "placement",
      type: "enum",
      options: ["bottom", "top", "start", "end"],
      defaultValue: "bottom",
    },
  ],
};

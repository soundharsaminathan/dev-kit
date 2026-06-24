import type { ComponentRegistryConfig } from "../types";

export const disclosureConfig: ComponentRegistryConfig = {
  name: "Disclosure",
  slug: "disclosure",
  category: "navigation",
  description: "Disclosure component showcase.",
  controls: [
    {
      name: "triggerLabel",
      type: "string",
      defaultValue: "System Requirements",
    },
    {
      name: "panelContent",
      type: "string",
      defaultValue: "Requires a modern browser and at least 4GB of RAM.",
    },
    { name: "defaultExpanded", type: "boolean", defaultValue: false },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};

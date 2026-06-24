import type { ComponentRegistryConfig } from "../types";

export const textAreaConfig: ComponentRegistryConfig = {
  name: "Text Area",
  slug: "text-area",
  category: "forms",
  description: "Text Area component showcase.",
  controls: [
    {
      name: "placeholder",
      type: "string",
      defaultValue: "Type your message here.",
    },
    { name: "aria-label", type: "string", defaultValue: "Message" },
    { name: "labelText", type: "string", defaultValue: "Message" },
    {
      name: "descriptionText",
      type: "string",
      defaultValue: "We never share your messages.",
    },
    { name: "showField", type: "boolean", defaultValue: false },
  ],
};

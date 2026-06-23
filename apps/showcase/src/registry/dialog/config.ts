import type { ComponentRegistryConfig } from "../types";

export const dialogConfig: ComponentRegistryConfig = {
  name: "Dialog",
  slug: "dialog",
  category: "overlays",
  description: "Dialog component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: false },
    { name: "title", type: "string", defaultValue: "Edit profile" },
    {
      name: "description",
      type: "string",
      defaultValue:
        "Make changes to your profile here. Click save when you are done.",
    },
    {
      name: "bodyText",
      type: "string",
      defaultValue: "Dialog body content goes here.",
    },
    { name: "showCloseButton", type: "boolean", defaultValue: true },
    { name: "showFooter", type: "boolean", defaultValue: true },
  ],
};

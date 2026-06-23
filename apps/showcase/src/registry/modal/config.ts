import type { ComponentRegistryConfig } from "../types";

export const modalConfig: ComponentRegistryConfig = {
  name: "Modal",
  slug: "modal",
  category: "overlays",
  description: "Modal component showcase.",
  controls: [
    { name: "defaultOpen", type: "boolean", defaultValue: true },
    { name: "isDismissable", type: "boolean", defaultValue: true },
    { name: "showCloseButton", type: "boolean", defaultValue: true },
    { name: "title", type: "string", defaultValue: "Modal panel" },
    {
      name: "description",
      type: "string",
      defaultValue: "Modal provides the backdrop, viewport, and panel shell.",
    },
    {
      name: "body",
      type: "string",
      defaultValue: "Compose with Dialog subcomponents for content layout.",
    },
  ],
};

import type { ComponentRegistryConfig } from "../types";

export const dropZoneConfig: ComponentRegistryConfig = {
  name: "Drop Zone",
  slug: "drop-zone",
  category: "forms",
  description: "Drop Zone component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Drop files here" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};

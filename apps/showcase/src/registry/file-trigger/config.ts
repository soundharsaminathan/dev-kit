import type { ComponentRegistryConfig } from "../types";

export const fileTriggerConfig: ComponentRegistryConfig = {
  name: "File Trigger",
  slug: "file-trigger",
  category: "buttons",
  description: "File Trigger component showcase.",
  controls: [
    { name: "buttonLabel", type: "string", defaultValue: "Choose file" },
    { name: "accept", type: "string", defaultValue: "image/*" },
    { name: "allowsMultiple", type: "boolean", defaultValue: false },
    { name: "allowsClearing", type: "boolean", defaultValue: true },
    { name: "clearLabel", type: "string", defaultValue: "Clear selection" },
    { name: "isDisabled", type: "boolean", defaultValue: false },
  ],
};

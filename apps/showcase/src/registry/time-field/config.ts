import type { ComponentRegistryConfig } from "../types";

export const timeFieldConfig: ComponentRegistryConfig = {
  name: "Time Field",
  slug: "time-field",
  category: "date-time",
  description: "Time Field component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Meeting time" },
    { name: "description", type: "string", defaultValue: "" },
    { name: "errorMessage", type: "string", defaultValue: "" },
  ],
};

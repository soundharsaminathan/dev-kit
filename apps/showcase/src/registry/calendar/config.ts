import type { ComponentRegistryConfig } from "../types";

export const calendarConfig: ComponentRegistryConfig = {
  name: "Calendar",
  slug: "calendar",
  category: "date-time",
  description: "Calendar component showcase.",
  controls: [
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "isReadOnly", type: "boolean", defaultValue: false },
  ],
};

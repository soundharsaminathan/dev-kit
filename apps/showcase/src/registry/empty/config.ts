import type { ComponentRegistryConfig } from "../types";

export const emptyConfig: ComponentRegistryConfig = {
  name: "Empty",
  slug: "empty",
  category: "layout",
  description: "Empty component showcase.",
  controls: [
    { name: "title", type: "string", defaultValue: "No projects yet" },
    {
      name: "description",
      type: "string",
      defaultValue: "Create your first project to get started.",
    },
    {
      name: "mediaVariant",
      type: "enum",
      options: ["default", "icon"],
      defaultValue: "icon",
    },
    { name: "actionLabel", type: "string", defaultValue: "Create project" },
    { name: "showAction", type: "boolean", defaultValue: true },
  ],
};

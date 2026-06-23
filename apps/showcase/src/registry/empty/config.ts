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
  ],
};

import type { ComponentRegistryConfig } from "../types";

export const tagGroupConfig: ComponentRegistryConfig = {
  name: "Tag Group",
  slug: "tag-group",
  category: "feedback",
  description: "Tag Group component showcase.",
  controls: [
    {
      name: "size",
      type: "enum",
      options: ["sm", "md", "lg"],
      defaultValue: "md",
    },
    { name: "label", type: "string", defaultValue: "Categories" },
    { name: "isRemovable", type: "boolean", defaultValue: false },
  ],
};

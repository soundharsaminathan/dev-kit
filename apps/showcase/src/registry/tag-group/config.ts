import type { ComponentRegistryConfig } from "../types";

export const tagGroupConfig: ComponentRegistryConfig = {
  name: "Tag Group",
  slug: "tag-group",
  category: "feedback",
  description: "Tag Group component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "TagGroup" }],
};

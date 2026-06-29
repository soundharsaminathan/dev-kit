import type { ComponentRegistryConfig } from "../types";

export const avatarConfig: ComponentRegistryConfig = {
  name: "Avatar",
  slug: "avatar",
  category: "typography",
  description: "Avatar component showcase.",
  controls: [{ name: "size", type: "enum", options: ["sm", "md", "lg"] }],
};

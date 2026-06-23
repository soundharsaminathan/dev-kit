import type { ComponentRegistryConfig } from "../types";

export const avatarConfig: ComponentRegistryConfig = {
  name: "Avatar",
  slug: "avatar",
  category: "typography",
  description: "Avatar component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Avatar" }],
};

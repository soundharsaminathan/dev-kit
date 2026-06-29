import type { ComponentRegistryConfig } from "../types";

export const linkConfig: ComponentRegistryConfig = {
  name: "Link",
  slug: "link",
  category: "typography",
  description: "Link component showcase.",
  controls: [
    {
      name: "variant",
      type: "enum",
      options: ["accent", "quiet", "unstyled"],
      defaultValue: "accent",
    },
    { name: "isDisabled", type: "boolean" },
    { name: "children", type: "string", defaultValue: "Learn more" },
    { name: "href", type: "string", defaultValue: "https://example.com" },
  ],
};

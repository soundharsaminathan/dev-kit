import type { ComponentRegistryConfig } from "../types";

export const breadcrumbsConfig: ComponentRegistryConfig = {
  name: "Breadcrumbs",
  slug: "breadcrumbs",
  category: "navigation",
  description: "Breadcrumbs component showcase.",
  controls: [
    { name: "isDisabled", type: "boolean", defaultValue: false },
    { name: "useCollection", type: "boolean", defaultValue: true },
    { name: "separator", type: "string", defaultValue: "›" },
  ],
};

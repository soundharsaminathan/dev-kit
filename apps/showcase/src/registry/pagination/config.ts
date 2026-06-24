import type { ComponentRegistryConfig } from "../types";

export const paginationConfig: ComponentRegistryConfig = {
  name: "Pagination",
  slug: "pagination",
  category: "navigation",
  description: "Pagination component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "Pagination" }],
};

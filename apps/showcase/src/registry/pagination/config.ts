import type { ComponentRegistryConfig } from "../types";

export const paginationConfig: ComponentRegistryConfig = {
  name: "Pagination",
  slug: "pagination",
  category: "navigation",
  description: "Pagination component showcase.",
  controls: [
    { name: "totalPages", type: "number", defaultValue: 10 },
    { name: "initialPage", type: "number", defaultValue: 2 },
  ],
};

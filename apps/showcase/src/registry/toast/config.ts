import type { ComponentRegistryConfig } from "../types";

export const toastConfig: ComponentRegistryConfig = {
  name: "Toast",
  slug: "toast",
  category: "feedback",
  description: "Toast component showcase.",
  controls: [
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    {
      name: "variant",
      type: "enum",
      options: ["neutral", "success", "error", "warning", "info", "loading"],
    },
    {
      name: "position",
      type: "enum",
      options: [
        "top-left",
        "top-center",
        "top-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ],
    },
    { name: "timeout", type: "number" },
    { name: "showAction", type: "boolean" },
    { name: "actionLabel", type: "string" },
  ],
};

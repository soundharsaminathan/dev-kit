import type { ComponentRegistryConfig } from "../types";

export const formConfig: ComponentRegistryConfig = {
  name: "Form",
  slug: "form",
  category: "forms",
  description: "Form component showcase.",
  controls: [
    { name: "label", type: "string", defaultValue: "Email" },
    { name: "placeholder", type: "string", defaultValue: "you@example.com" },
  ],
};

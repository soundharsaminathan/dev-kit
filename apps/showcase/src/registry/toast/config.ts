import type { ComponentRegistryConfig } from "../types";

export const toastConfig: ComponentRegistryConfig = {
  name: "Toast",
  slug: "toast",
  category: "feedback",
  description: "Toast component showcase.",
  controls: [
    { name: "title", type: "string", defaultValue: "Profile updated" },
    {
      name: "description",
      type: "string",
      defaultValue: "Your profile changes are live.",
    },
  ],
};

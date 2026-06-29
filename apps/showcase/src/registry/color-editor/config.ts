import type { ComponentRegistryConfig } from "../types";

export const colorEditorConfig: ComponentRegistryConfig = {
  name: "Color Editor",
  slug: "color-editor",
  category: "color",
  description: "Color Editor component showcase.",
  controls: [
    {
      name: "colorFormat",
      type: "enum",
      options: ["hex", "rgb", "hsl", "hsb"],
      defaultValue: "hex",
    },
    { name: "showAlphaChannel", type: "boolean", defaultValue: false },
    { name: "showFormatSelector", type: "boolean", defaultValue: true },
    { name: "defaultValue", type: "string", defaultValue: "#6366f1" },
  ],
};

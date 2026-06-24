import type { ComponentRegistryConfig } from "../types";

export const colorEditorConfig: ComponentRegistryConfig = {
  name: "Color Editor",
  slug: "color-editor",
  category: "color",
  description: "Color Editor component showcase.",
  controls: [{ name: "children", type: "string", defaultValue: "ColorEditor" }],
};

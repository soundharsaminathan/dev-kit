import type { ComponentRegistryConfig } from "../types";

export const dragAndDropConfig: ComponentRegistryConfig = {
  name: "Drag and Drop",
  slug: "drag-and-drop",
  category: "forms",
  description:
    "Drag and drop utilities with DropIndicator and the useDragAndDrop hook for collection reordering.",
  controls: [
    { name: "aria-label", type: "string", defaultValue: "Reorderable files" },
  ],
};

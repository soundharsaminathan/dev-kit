import { createContext, useContext } from "react";
import type { TagGroupContextValue } from "./tag-group.types";

const TagGroupContext = createContext<TagGroupContextValue | null>(null);

function useTagGroupContext(component: string): TagGroupContextValue {
  const context = useContext(TagGroupContext);
  if (!context) {
    throw new Error(`${component} must be used within TagGroup`);
  }
  return context;
}

export { TagGroupContext, useTagGroupContext };

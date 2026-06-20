import { createContext, useContext } from "react";
import type { MenuContextValue } from "./menu.types";

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(component: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error(`${component} must be used within Menu`);
  }
  return context;
}

export { MenuContext, useMenuContext };

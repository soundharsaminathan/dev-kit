import { ThemeProvider } from "@dev-ui/core";
import { defaultPackLoaders } from "@dev-ui/icons/loaders";
import lucidePack from "@dev-ui/icons-packs/lucide";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="default"
      icons={{ library: "lucide" }}
      initialIconPack={lucidePack}
      iconLoaders={defaultPackLoaders}
    >
      {children}
    </ThemeProvider>
  );
}

export { useTheme } from "@dev-ui/core";
export { useIcons } from "@dev-ui/icons";
export { formatThemeLabel } from "./format-theme-label";

import { ThemeProvider } from "@dev-ui/core";
import lucidePack from "@dev-ui/icons-packs/lucide";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="default"
      defaultMode="light"
      icons={{ library: "lucide" }}
      initialIconPack={lucidePack}
      iconLoaders={{
        lucide: () => Promise.resolve({ default: lucidePack }),
      }}
    >
      {children}
    </ThemeProvider>
  );
}

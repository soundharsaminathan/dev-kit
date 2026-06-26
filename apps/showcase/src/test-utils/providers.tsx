import { ThemeProvider } from "@dev-ui/core";
import lucidePack from "@dev-ui/icons-packs/lucide";
import type { ReactNode } from "react";

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      defaultMode="light"
      icons={{ library: "lucide" }}
      initialIconPack={lucidePack}
    >
      {children}
    </ThemeProvider>
  );
}

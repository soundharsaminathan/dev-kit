import { OverlayProvider } from "@dev-ui/components/popover";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <OverlayProvider>{children}</OverlayProvider>
    </ThemeProvider>
  );
}

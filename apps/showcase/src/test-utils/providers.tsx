import { ThemeProvider } from "@dev-ui/core";
import type { ReactNode } from "react";

export function TestProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultMode="light">{children}</ThemeProvider>;
}

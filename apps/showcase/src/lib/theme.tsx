import { ThemeProvider } from "@dev-ui/core";
import type { ReactNode } from "react";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider defaultTheme="default">{children}</ThemeProvider>;
}

export { useTheme } from "@dev-ui/core";
export { formatThemeLabel } from "./format-theme-label";

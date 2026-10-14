import { OverlayProvider } from "@dev-ui/components/popover";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/lib/query";
import type { RouterAuthContext } from "@/lib/require-auth";
import { AppThemeProvider } from "@/lib/theme";

export const Route = createRootRouteWithContext<RouterAuthContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AppThemeProvider>
      <OverlayProvider>
        <QueryProvider>
          <Outlet />
        </QueryProvider>
      </OverlayProvider>
    </AppThemeProvider>
  );
}

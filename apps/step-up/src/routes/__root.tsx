import { OverlayProvider } from "@dev-ui/components/popover";
import { ToastProvider } from "@dev-ui/components/toast";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { PwaInstallProvider } from "@/lib/pwa-install";
import { QueryProvider } from "@/lib/query";
import type { RouterAuthContext } from "@/lib/require-auth";
import { SessionGate } from "@/lib/session-gate";
import { AppThemeProvider } from "@/lib/theme";
import { ThemeColorSync } from "@/lib/theme-color";
import { PwaBanners } from "@/modules/pwa/pwa-banners";

export const Route = createRootRouteWithContext<RouterAuthContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemeColorSync />
      <QueryProvider>
        <SessionGate>
          <PwaInstallProvider>
            <OverlayProvider>
              <ToastProvider position="top-right" timeout={3000}>
                <PwaBanners />
                <Outlet />
              </ToastProvider>
            </OverlayProvider>
          </PwaInstallProvider>
        </SessionGate>
      </QueryProvider>
    </AppThemeProvider>
  );
}

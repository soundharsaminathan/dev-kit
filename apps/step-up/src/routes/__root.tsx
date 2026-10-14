import { OverlayProvider } from "@dev-ui/components/popover";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { BootThemeProvider } from "@/lib/boot-theme-provider";
import { DeferredToastProvider } from "@/lib/deferred-toast";
import { PwaInstallProvider } from "@/lib/pwa-install";
import { QueryProvider } from "@/lib/query";
import type { RouterAuthContext } from "@/lib/require-auth";
import { SessionGate } from "@/lib/session-gate";
import { ThemeColorSync } from "@/lib/theme-color";
import { NotFoundPage } from "@/modules/layout/not-found";

const PwaBanners = lazy(() =>
  import("@/modules/pwa/pwa-banners").then((m) => ({ default: m.PwaBanners })),
);

export const Route = createRootRouteWithContext<RouterAuthContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return (
    <BootThemeProvider>
      <ThemeColorSync />
      <QueryProvider>
        <SessionGate>
          <PwaInstallProvider>
            <OverlayProvider>
              <DeferredToastProvider position="top-right" timeout={3000}>
                <Suspense fallback={null}>
                  <PwaBanners />
                </Suspense>
                <Outlet />
              </DeferredToastProvider>
            </OverlayProvider>
          </PwaInstallProvider>
        </SessionGate>
      </QueryProvider>
    </BootThemeProvider>
  );
}

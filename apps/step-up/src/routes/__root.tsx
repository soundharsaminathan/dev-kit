import { OverlayProvider } from "@dev-ui/components/popover";
import { ToastProvider } from "@dev-ui/components/toast";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ApiProvider } from "@/lib/api-context";
import { ChatSocketProvider } from "@/lib/chat-socket";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { PwaInstallProvider } from "@/lib/pwa-install";
import { QueryProvider } from "@/lib/query";
import type { RouterAuthContext } from "@/lib/require-auth";
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
        <ApiProvider>
          <PushNotificationsProvider>
            <ChatSocketProvider>
              <PwaInstallProvider>
                <OverlayProvider>
                  <ToastProvider position="bottom-center">
                    <PwaBanners />
                    <Outlet />
                  </ToastProvider>
                </OverlayProvider>
              </PwaInstallProvider>
            </ChatSocketProvider>
          </PushNotificationsProvider>
        </ApiProvider>
      </QueryProvider>
    </AppThemeProvider>
  );
}

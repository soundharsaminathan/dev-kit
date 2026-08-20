import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppThemeProvider } from "@/lib/theme";
import { IdeProvider } from "@/state/IdeContext";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <AppThemeProvider>
      <IdeProvider>
        <Outlet />
      </IdeProvider>
    </AppThemeProvider>
  );
}

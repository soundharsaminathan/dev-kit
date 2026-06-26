import { OverlayProvider } from "@dev-ui/components/popover";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppThemeProvider } from "@/lib/theme";
import styles from "@/modules/layout/app-shell.module.scss";
import { Header } from "@/modules/layout/header";
import { ComponentNotFound } from "@/modules/layout/not-found";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: ComponentNotFound,
});

function RootLayout() {
  return (
    <AppThemeProvider>
      <div className={styles.shell}>
        <OverlayProvider>
          <Header />
        </OverlayProvider>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </AppThemeProvider>
  );
}

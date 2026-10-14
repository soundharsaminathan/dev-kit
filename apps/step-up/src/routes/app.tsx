import { createFileRoute, Outlet } from "@tanstack/react-router";
import { STAFF_ROLES } from "@/lib/constants";
import { requireAuth } from "@/lib/require-auth";
import { ImportJobProvider } from "@/modules/import/import-job-provider";
import { ImportStatusBanner } from "@/modules/import/import-status-banner";
import { AppShell } from "@/modules/layout/app-shell";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context, location }) => {
    requireAuth(context.auth, {
      roles: STAFF_ROLES,
      fallback: "/me",
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <ImportJobProvider>
      <ImportStatusBanner />
      <AppShell variant="app">
        <Outlet />
      </AppShell>
    </ImportJobProvider>
  );
}

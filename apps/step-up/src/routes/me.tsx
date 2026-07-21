import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { MEMBER_ROLES } from "@/lib/constants";
import { requireAuth } from "@/lib/require-auth";
import { AppShell } from "@/modules/layout/app-shell";
import {
  ActiveStudentProvider,
  ChildSwitcher,
} from "@/modules/me/child-switcher";

export const Route = createFileRoute("/me")({
  beforeLoad: ({ context, location }) => {
    requireAuth(context.auth, {
      roles: MEMBER_ROLES,
      fallback: "/app",
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: MeLayout,
});

function MeLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHome = pathname === "/me" || pathname === "/me/";

  return (
    <ActiveStudentProvider>
      <AppShell variant="me">
        {!isHome ? <ChildSwitcher /> : null}
        <Outlet />
      </AppShell>
    </ActiveStudentProvider>
  );
}

import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { MEMBER_ROLES } from "@/lib/constants";
import {
  isStudentOnboardingIncomplete,
  shouldRedirectToStudentOnboarding,
} from "@/lib/onboarding";
import { requireAuth } from "@/lib/require-auth";
import { AppShell } from "@/modules/layout/app-shell";
import { ActiveStudentProvider } from "@/modules/me/active-student-provider";

export const Route = createFileRoute("/me")({
  beforeLoad: ({ context, location }) => {
    const user = requireAuth(context.auth, {
      roles: MEMBER_ROLES,
      fallback: "/app",
      pathname: location.pathname,
      searchStr: location.searchStr,
    });

    const onOnboarding = location.pathname.startsWith("/me/onboarding");
    if (shouldRedirectToStudentOnboarding(user, location.pathname)) {
      throw redirect({ to: "/me/onboarding", replace: true });
    }
    if (!isStudentOnboardingIncomplete(user) && onOnboarding) {
      throw redirect({ to: "/me", replace: true });
    }
  },
  component: MeLayout,
});

function MeLayout() {
  const isOnboarding = useRouterState({
    select: (state) => state.location.pathname.startsWith("/me/onboarding"),
  });

  if (isOnboarding) {
    return <Outlet />;
  }

  return (
    <ActiveStudentProvider>
      <AppShell variant="me">
        <Outlet />
      </AppShell>
    </ActiveStudentProvider>
  );
}

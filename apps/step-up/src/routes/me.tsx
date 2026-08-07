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
import { ChildSwitcher } from "@/modules/me/child-switcher";

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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isHome = pathname === "/me" || pathname === "/me/";
  const isTrainers =
    pathname === "/me/trainers" || pathname.startsWith("/me/trainers/");
  const isOnboarding = pathname.startsWith("/me/onboarding");
  const bannerOwnsChildSwitcher = isHome || isTrainers;

  if (isOnboarding) {
    return <Outlet />;
  }

  return (
    <ActiveStudentProvider>
      <AppShell variant="me">
        {!bannerOwnsChildSwitcher ? <ChildSwitcher /> : null}
        <Outlet />
      </AppShell>
    </ActiveStudentProvider>
  );
}

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { APPROVAL_PAGE_ROLES } from "@/lib/page-access";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/app/approvals")({
  beforeLoad: ({ context, location }) => {
    requireAuth(context.auth, {
      roles: [...APPROVAL_PAGE_ROLES],
      fallback: "/app",
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: () => <Outlet />,
});

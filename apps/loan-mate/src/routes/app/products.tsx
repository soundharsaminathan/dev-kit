import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PRODUCT_PAGE_ROLES } from "@/lib/page-access";
import { requireAuth } from "@/lib/require-auth";

export const Route = createFileRoute("/app/products")({
  beforeLoad: ({ context, location }) => {
    requireAuth(context.auth, {
      roles: [...PRODUCT_PAGE_ROLES],
      fallback: "/app",
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: () => <Outlet />,
});

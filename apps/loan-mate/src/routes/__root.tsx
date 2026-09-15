import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/lib/query";
import type { RouterAuthContext } from "@/lib/require-auth";

export const Route = createRootRouteWithContext<RouterAuthContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}

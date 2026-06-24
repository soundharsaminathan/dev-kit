import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ComponentsLayout } from "@/modules/layout/showcase-sidebar";

export const Route = createFileRoute("/components")({
  component: ComponentsRouteLayout,
});

function ComponentsRouteLayout() {
  return (
    <ComponentsLayout>
      <Outlet />
    </ComponentsLayout>
  );
}

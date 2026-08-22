import { createFileRoute, redirect } from "@tanstack/react-router";

/** Feature toggles live in admin; studio settings no longer expose them. */
export const Route = createFileRoute("/app/settings/features")({
  beforeLoad: () => {
    throw redirect({ to: "/app/settings/profile" });
  },
});

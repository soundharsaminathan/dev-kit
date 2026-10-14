import { createFileRoute, redirect } from "@tanstack/react-router";
import { homePathForUser } from "@/lib/require-auth";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth.user) {
      throw redirect({
        to: homePathForUser(context.auth.user.role),
        replace: true,
      });
    }
    throw redirect({ to: "/login", replace: true });
  },
});

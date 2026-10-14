import { createFileRoute } from "@tanstack/react-router";
import { FollowRequestsPage } from "@/modules/social/follow-requests-page";

export const Route = createFileRoute("/app/profile_/follow-requests")({
  component: AppFollowRequestsRoute,
});

function AppFollowRequestsRoute() {
  return <FollowRequestsPage backTo="/app/profile" />;
}

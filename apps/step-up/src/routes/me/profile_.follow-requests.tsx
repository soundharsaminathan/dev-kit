import { createFileRoute } from "@tanstack/react-router";
import { FollowRequestsPage } from "@/modules/social/follow-requests-page";

export const Route = createFileRoute("/me/profile_/follow-requests")({
  component: FollowRequestsRoute,
});

function FollowRequestsRoute() {
  return <FollowRequestsPage />;
}

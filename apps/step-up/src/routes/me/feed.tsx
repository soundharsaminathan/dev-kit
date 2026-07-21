import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/modules/social/feed-page";

export const Route = createFileRoute("/me/feed")({
  component: MeFeedPage,
});

function MeFeedPage() {
  return <FeedPage />;
}

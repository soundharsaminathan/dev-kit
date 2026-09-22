import { createFileRoute, redirect } from "@tanstack/react-router";
import { mapDiscoverToMarketplace } from "@/modules/marketplace/search";

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>) =>
    mapDiscoverToMarketplace(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/studios",
      search,
      replace: true,
    });
  },
});

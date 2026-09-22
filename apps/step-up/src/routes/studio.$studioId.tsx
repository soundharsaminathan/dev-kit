import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { fetchMarketplaceStudio } from "@/modules/marketplace/catalog";

export const Route = createFileRoute("/studio/$studioId")({
  beforeLoad: async ({ params }) => {
    try {
      const studio = await fetchMarketplaceStudio(params.studioId);
      throw redirect({
        to: "/studios/$slug",
        params: { slug: studio.slug },
        replace: true,
      });
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect({ to: "/studios", replace: true });
    }
  },
});

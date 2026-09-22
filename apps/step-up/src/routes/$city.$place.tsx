import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketplaceHome } from "@/modules/marketplace/home";
import {
  parseMarketplaceCity,
  parseMarketplacePlace,
} from "@/modules/marketplace/place";
import { parseMarketplaceSearch } from "@/modules/marketplace/search";

export const Route = createFileRoute("/$city/$place")({
  validateSearch: parseMarketplaceSearch,
  beforeLoad: ({ params }) => {
    const city = parseMarketplaceCity(params.city);
    const place = parseMarketplacePlace(params.place);
    if (!city || !place) {
      throw redirect({
        to: "/",
        search: city ? { city: city.id } : {},
        replace: true,
      });
    }
  },
  component: MarketplacePlacePage,
});

function MarketplacePlacePage() {
  const { city, place } = Route.useParams();
  const search = Route.useSearch();
  const parsed = parseMarketplacePlace(place);
  if (!parsed) return null;
  return (
    <MarketplaceHome
      tab={search.tab ?? "classes"}
      search={{
        ...search,
        city,
        style: parsed.kind === "style" ? parsed.id : undefined,
        locality: parsed.kind === "locality" ? parsed.id : undefined,
      }}
      place={parsed}
    />
  );
}

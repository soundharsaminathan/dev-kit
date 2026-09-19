import { useQuery } from "@tanstack/react-query";
import { fetchDiscoverLanding } from "./api";
import { useDiscoverCity } from "./city-context";

export function useDiscoverLanding() {
  const { cityId } = useDiscoverCity();
  return useQuery({
    queryKey: ["discover-landing", cityId],
    queryFn: () => fetchDiscoverLanding(cityId),
    staleTime: 60_000,
  });
}

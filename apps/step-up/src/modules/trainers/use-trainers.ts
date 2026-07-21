import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import type { StudioTrainer } from "./types";

export function useStudioTrainers() {
  const api = useApi();

  return useQuery({
    queryKey: ["studio-trainers", STUDIO_ID],
    queryFn: () =>
      api.get<StudioTrainer[]>(`/users/studio/${STUDIO_ID}/trainers`),
  });
}

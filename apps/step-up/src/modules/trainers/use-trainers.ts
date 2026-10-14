import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import type { StudioTrainer } from "./types";

export function useStudioTrainers() {
  const api = useApi();
  const studioId = useStudioId();

  return useQuery({
    queryKey: ["studio-trainers", studioId],
    queryFn: () =>
      api.get<StudioTrainer[]>(`/users/studio/${studioId}/trainers`),
  });
}

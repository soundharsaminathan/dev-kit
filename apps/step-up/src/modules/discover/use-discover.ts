import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import type { DiscoverBatch } from "./types";

export type DiscoverFilters = {
  style?: string;
  category?: string;
  trainerId?: string;
  branchId?: string;
  search?: string;
  studentId?: string;
};

function buildQuery(filters: DiscoverFilters) {
  const params = new URLSearchParams({ activeOnly: "true" });
  if (filters.style) params.set("style", filters.style);
  if (filters.category) params.set("category", filters.category);
  if (filters.trainerId) params.set("trainerId", filters.trainerId);
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.search) params.set("search", filters.search);
  if (filters.studentId) params.set("studentId", filters.studentId);
  return params.toString();
}

export function useDiscoverBatches(filters: DiscoverFilters = {}) {
  const api = useApi();
  const qs = buildQuery(filters);

  return useQuery({
    queryKey: ["batches", "discover", STUDIO_ID, qs],
    queryFn: () =>
      api.get<DiscoverBatch[]>(`/batches/studio/${STUDIO_ID}?${qs}`),
  });
}

export function useDiscoverBatch(id: string, studentId?: string | null) {
  const api = useApi();
  const qs = studentId
    ? `?${new URLSearchParams({ studentId }).toString()}`
    : "";

  return useQuery({
    queryKey: ["batches", id, studentId ?? null],
    queryFn: () => api.get<DiscoverBatch>(`/batches/${id}${qs}`),
    enabled: Boolean(id),
  });
}

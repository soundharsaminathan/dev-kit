import { useTheme } from "@dev-ui/core";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useLayoutEffect } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useOptionalStudioId } from "@/lib/use-studio-id";
import { brandThemeToDefinition } from "./brand-theme";
import { useStudioBrandEdit } from "./studio-brand-edit-context";
import type { StudioBrandThemePayload } from "./types";

type StudioBrandResponse = {
  id: string;
  brandTheme?: StudioBrandThemePayload | null;
};

export function StudioBrandProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const studioId = useOptionalStudioId();
  const { user } = useAuth();
  const { setLiveTheme } = useTheme();
  const { isEditing } = useStudioBrandEdit();

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<StudioBrandResponse>(`/studios/${studioId}`),
    enabled: Boolean(user && studioId),
  });

  const brandTheme = studioQuery.data?.brandTheme ?? null;

  useLayoutEffect(() => {
    if (isEditing) return;
    if (!studioId) return;
    if (!studioQuery.isSuccess) return;

    if (brandTheme) {
      setLiveTheme(brandThemeToDefinition(brandTheme, studioId));
      return;
    }

    setLiveTheme(null);
  }, [brandTheme, isEditing, setLiveTheme, studioId, studioQuery.isSuccess]);

  return children;
}

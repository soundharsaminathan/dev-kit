import { useTheme } from "@dev-ui/core";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useLayoutEffect } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { brandThemeToDefinition } from "./brand-theme";
import { useStudioBrandEdit } from "./studio-brand-edit-context";
import type { StudioBrandThemePayload } from "./types";

type StudioBrandResponse = {
  id: string;
  brandTheme?: StudioBrandThemePayload | null;
};

export function StudioBrandProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { user } = useAuth();
  const { setLiveTheme } = useTheme();
  const { isEditing } = useStudioBrandEdit();

  const studioQuery = useQuery({
    queryKey: ["studio", STUDIO_ID],
    queryFn: () => api.get<StudioBrandResponse>(`/studios/${STUDIO_ID}`),
    enabled: Boolean(user),
  });

  const brandTheme = studioQuery.data?.brandTheme ?? null;

  useLayoutEffect(() => {
    if (isEditing) return;

    if (brandTheme) {
      setLiveTheme(brandThemeToDefinition(brandTheme, STUDIO_ID));
      return;
    }

    setLiveTheme(null);
  }, [brandTheme, isEditing, setLiveTheme]);

  return children;
}

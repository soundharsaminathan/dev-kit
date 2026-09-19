import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  type DanceStyle,
  effectiveDanceStyles,
  fallbackAbbrev,
  slugifyDanceStyleId,
} from "@/lib/dance-styles";
import { useStudioId } from "@/lib/use-studio-id";
import type { Studio } from "./types";

const FALLBACK_COLORS = [
  "#E4572E",
  "#6C63FF",
  "#00B894",
  "#E84393",
  "#0984E3",
  "#E17055",
  "#6C5CE7",
  "#00CEC9",
];

function uniqueSlug(label: string, existing: DanceStyle[], excludeId?: string) {
  const base = slugifyDanceStyleId(label) || "style";
  let candidate = base;
  let index = 2;
  while (
    existing.some((style) => style.id === candidate && style.id !== excludeId)
  ) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function cloneStyles(styles: DanceStyle[]) {
  return styles.map((style) => ({ ...style }));
}

export function useStudioDanceStyles() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioDanceStyles");
  const [styles, setStyles] = useState<DanceStyle[]>([]);
  const [baseline, setBaseline] = useState<DanceStyle[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    const next = cloneStyles(
      effectiveDanceStyles(studioQuery.data.settings?.danceStyles),
    );
    setStyles(next);
    setBaseline(cloneStyles(next));
    setHydrated(true);
  }, [studioQuery.data, hydrated]);

  const isDirty =
    hydrated && JSON.stringify(styles) !== JSON.stringify(baseline);

  const updateSettings = useMutation({
    mutationFn: (danceStyles: DanceStyle[]) =>
      api.patch(`/studios/${studioId}/settings`, { danceStyles }),
    onSuccess: (_data, danceStyles) => {
      setBaseline(cloneStyles(danceStyles));
      setStyles(cloneStyles(danceStyles));
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      toast({
        title: "Dance styles saved",
        description: "Studio dance style list updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save dance styles",
        description:
          error instanceof Error
            ? error.message
            : "Could not save dance styles.",
        variant: "error",
      });
    },
  });

  function updateStyle(id: string, patch: Partial<DanceStyle>) {
    setStyles((current) =>
      current.map((style) => {
        if (style.id !== id) return style;
        const next = { ...style, ...patch };
        if (patch.label !== undefined && !patch.abbrev) {
          next.abbrev = fallbackAbbrev(patch.label) || style.abbrev;
        }
        return next;
      }),
    );
  }

  function addStyle() {
    setStyles((current) => {
      const label = `Style ${current.length + 1}`;
      const id = uniqueSlug(label, current);
      return [
        ...current,
        {
          id,
          label,
          abbrev: fallbackAbbrev(label),
          color: FALLBACK_COLORS[current.length % FALLBACK_COLORS.length]!,
          emoji: "💃",
        },
      ];
    });
  }

  function removeStyle(id: string) {
    setStyles((current) => current.filter((style) => style.id !== id));
  }

  function moveStyle(id: string, direction: -1 | 1) {
    setStyles((current) => {
      const index = current.findIndex((style) => style.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return next;
    });
  }

  function reset() {
    setStyles(cloneStyles(baseline));
  }

  function save() {
    const cleaned = styles
      .map((style) => ({
        ...style,
        id: style.id.trim(),
        label: style.label.trim(),
        abbrev: style.abbrev.trim().toUpperCase().slice(0, 4),
        color: style.color.trim(),
        emoji: style.emoji.trim(),
      }))
      .filter((style) => style.label.length > 0);

    const withIds = cleaned.map((style, index) => {
      const id = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(style.id)
        ? style.id
        : uniqueSlug(style.label, cleaned, style.id) || `style-${index + 1}`;
      return {
        ...style,
        id,
        abbrev: style.abbrev || fallbackAbbrev(style.label),
        emoji: style.emoji || "💃",
        color: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
          style.color,
        )
          ? style.color
          : "#E4572E",
      };
    });

    updateSettings.mutate(withIds);
  }

  return {
    studioQuery,
    styles,
    isDirty,
    busy: updateSettings.isPending,
    addStyle,
    removeStyle,
    moveStyle,
    updateStyle,
    reset,
    save,
  };
}

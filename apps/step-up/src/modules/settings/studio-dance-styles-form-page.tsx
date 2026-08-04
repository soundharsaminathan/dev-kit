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
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import page from "./studio-dance-styles-form-page.module.scss";
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

export function StudioDanceStylesFormPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudioDanceStylesFormPage");
  const [styles, setStyles] = useState<DanceStyle[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  useEffect(() => {
    if (!studioQuery.data || hydrated) return;
    setStyles(
      cloneStyles(effectiveDanceStyles(studioQuery.data.settings?.danceStyles)),
    );
    setHydrated(true);
  }, [studioQuery.data, hydrated]);

  const updateSettings = useMutation({
    mutationFn: (danceStyles: DanceStyle[]) =>
      api.patch(`/studios/${studioId}/settings`, { danceStyles }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio", studioId] });
      toast({
        title: "Dance styles saved",
        description: "Studio dance style list updated.",
        variant: "success",
      });
    },
    onError: (error) => {
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

  function handleSave() {
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

  const busy = updateSettings.isPending;

  return (
    <>
      <Screen
        title="Dance styles"
        subtitle="Styles students and trainers can pick at this studio."
        showBack
        backTo="/app/settings"
        paddedCta
      >
        {studioQuery.isLoading ? (
          <SkeletonBlock height="12rem" radius="var(--radius-2xl)" />
        ) : null}

        {studioQuery.isError ? (
          <ErrorState
            description={
              studioQuery.error instanceof Error
                ? studioQuery.error.message
                : "Unable to load dance styles."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => studioQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {studioQuery.isFetched && !studioQuery.data ? (
          <EmptyState
            title="Studio not found"
            description="Unable to load dance styles."
          />
        ) : null}

        {studioQuery.data ? (
          <div className={page.root}>
            <div className={staff.softPanel}>
              <p className={staff.panelTitle}>Studio catalog</p>
              <p className={staff.panelDesc}>
                Add the dance styles offered at this studio. Edit names,
                abbreviations, colors, and emoji.
              </p>
              <div className={page.toolbar}>
                <TouchButton variant="quiet" onClick={addStyle} disabled={busy}>
                  Add style
                </TouchButton>
              </div>
            </div>

            {styles.length === 0 ? (
              <EmptyState
                title="No dance styles yet"
                description="Add the styles students and trainers can choose from."
                action={
                  <TouchButton variant="primary" onClick={addStyle}>
                    Add style
                  </TouchButton>
                }
              />
            ) : null}

            {styles.map((style, index) => (
              <div key={style.id} className={page.styleCard}>
                <div className={page.styleHeader}>
                  <span className={page.stylePreview}>
                    <span
                      className={page.previewSwatch}
                      style={{ background: style.color }}
                    >
                      {style.abbrev || "?"}
                    </span>
                    <span aria-hidden="true">{style.emoji}</span>
                    <span>{style.label || "Untitled"}</span>
                  </span>
                  <div className={staff.rowActions}>
                    <TouchButton
                      variant="quiet"
                      onClick={() => moveStyle(style.id, -1)}
                      disabled={busy || index === 0}
                    >
                      Up
                    </TouchButton>
                    <TouchButton
                      variant="quiet"
                      onClick={() => moveStyle(style.id, 1)}
                      disabled={busy || index === styles.length - 1}
                    >
                      Down
                    </TouchButton>
                    <TouchButton
                      variant="quiet"
                      onClick={() => removeStyle(style.id)}
                      disabled={busy}
                    >
                      Remove
                    </TouchButton>
                  </div>
                </div>

                <div className={page.fields}>
                  <FormInput
                    label="Name"
                    value={style.label}
                    onChange={(value) =>
                      updateStyle(style.id, { label: value })
                    }
                  />
                  <div className={page.inlineFields}>
                    <FormInput
                      label="Abbreviation"
                      value={style.abbrev}
                      maxLength={4}
                      onChange={(value) =>
                        updateStyle(style.id, {
                          abbrev: value.toUpperCase().slice(0, 4),
                        })
                      }
                    />
                    <FormInput
                      label="Emoji"
                      value={style.emoji}
                      onChange={(value) =>
                        updateStyle(style.id, { emoji: value })
                      }
                    />
                    <div className={page.colorField}>
                      <span className={page.colorLabel}>Color</span>
                      <div className={page.colorRow}>
                        <input
                          className={page.colorInput}
                          type="color"
                          value={
                            /^#([0-9a-fA-F]{6})$/.test(style.color)
                              ? style.color
                              : "#E4572E"
                          }
                          aria-label={`${style.label || "Style"} color`}
                          onChange={(event) =>
                            updateStyle(style.id, {
                              color: event.target.value.toUpperCase(),
                            })
                          }
                        />
                        <FormInput
                          label="Hex"
                          aria-label={`${style.label || "Style"} hex color`}
                          value={style.color}
                          onChange={(value) =>
                            updateStyle(style.id, { color: value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Screen>

      {studioQuery.data ? (
        <StickyCtaBar>
          <TouchButton variant="primary" onClick={handleSave} disabled={busy}>
            {updateSettings.isPending ? "Saving…" : "Save dance styles"}
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}

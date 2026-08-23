import { resolveDanceStyle } from "@/lib/dance-styles";
import { DEFAULT_SHARE_CTA, DEFAULT_SHARE_HEADLINE } from "./headlines";
import type {
  BatchShareCardData,
  BatchShareSource,
  ShareCardFieldKey,
  ShareCardFieldVisibility,
  ShareCardOptions,
  StudioShareSource,
} from "./types";

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function ageGroupFromCategory(
  category: BatchShareSource["category"],
): string | undefined {
  if (category === "KIDS") {
    return "Kids";
  }
  if (category === "ADULTS") {
    return "Adults";
  }
  return undefined;
}

function danceStyleFromBatch(batch: BatchShareSource): string | undefined {
  return (
    nonEmpty(batch.styleBadge) ?? nonEmpty(batch.danceCategories?.[0]?.name)
  );
}

function trainerNameFromBatch(batch: BatchShareSource): string | undefined {
  const names = (batch.trainers ?? [])
    .map((row) => nonEmpty(row.trainer?.name))
    .filter((name): name is string => Boolean(name))
    .slice(0, 2);
  if (names.length === 0) {
    return undefined;
  }
  return names.join(" · ");
}

function locationFromBatch(batch: BatchShareSource): string | undefined {
  return nonEmpty(batch.branch?.name) ?? nonEmpty(batch.branch?.address);
}

function accentFromStyle(
  danceStyle: string | undefined,
  studio: StudioShareSource,
): string | undefined {
  if (!danceStyle) {
    return undefined;
  }
  return resolveDanceStyle(danceStyle, studio.settings?.danceStyles ?? null)
    .color;
}

export function availableShareFields(
  data: Pick<BatchShareCardData, ShareCardFieldKey>,
): ShareCardFieldKey[] {
  const keys: ShareCardFieldKey[] = [
    "danceStyle",
    "trainerName",
    "schedule",
    "ageGroup",
    "location",
  ];
  return keys.filter((key) => Boolean(data[key]));
}

export function defaultFieldVisibility(
  data: Pick<BatchShareCardData, ShareCardFieldKey>,
): ShareCardFieldVisibility {
  const visibility: ShareCardFieldVisibility = {};
  for (const key of availableShareFields(data)) {
    visibility[key] = true;
  }
  return visibility;
}

export function applyFieldVisibility(
  data: BatchShareCardData,
  fields: ShareCardFieldVisibility,
): BatchShareCardData {
  return {
    ...data,
    danceStyle: fields.danceStyle === false ? undefined : data.danceStyle,
    trainerName: fields.trainerName === false ? undefined : data.trainerName,
    schedule: fields.schedule === false ? undefined : data.schedule,
    ageGroup: fields.ageGroup === false ? undefined : data.ageGroup,
    location: fields.location === false ? undefined : data.location,
  };
}

export function buildBatchShareCardData(
  batch: BatchShareSource,
  studio: StudioShareSource,
  options?: Partial<ShareCardOptions>,
): BatchShareCardData {
  const danceStyle = danceStyleFromBatch(batch);
  const base: BatchShareCardData = {
    batchName: batch.name.trim() || "Batch",
    coverImageUrl: nonEmpty(batch.coverImageUrl),
    danceStyle,
    trainerName: trainerNameFromBatch(batch),
    schedule: nonEmpty(batch.scheduleLabel),
    ageGroup: ageGroupFromCategory(batch.category),
    location: locationFromBatch(batch),
    headline: options?.headline?.trim() || DEFAULT_SHARE_HEADLINE,
    cta: options?.cta?.trim() || DEFAULT_SHARE_CTA,
    studioName: studio.name.trim() || "Studio",
    studioLogoUrl: nonEmpty(studio.logoUrl),
    studioPrimaryColor: accentFromStyle(danceStyle, studio),
  };

  if (options?.fields) {
    return applyFieldVisibility(base, options.fields);
  }
  return base;
}

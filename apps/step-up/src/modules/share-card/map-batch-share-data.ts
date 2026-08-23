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

/** Assign optional props without writing explicit `undefined` (exactOptionalPropertyTypes). */
function setOptional<K extends keyof BatchShareCardData>(
  target: BatchShareCardData,
  key: K,
  value: BatchShareCardData[K] | undefined,
) {
  if (value !== undefined) {
    target[key] = value;
  }
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
  const next: BatchShareCardData = {
    batchName: data.batchName,
    headline: data.headline,
    studioName: data.studioName,
  };
  setOptional(next, "coverImageUrl", data.coverImageUrl);
  setOptional(
    next,
    "danceStyle",
    fields.danceStyle === false ? undefined : data.danceStyle,
  );
  setOptional(
    next,
    "trainerName",
    fields.trainerName === false ? undefined : data.trainerName,
  );
  setOptional(
    next,
    "schedule",
    fields.schedule === false ? undefined : data.schedule,
  );
  setOptional(
    next,
    "ageGroup",
    fields.ageGroup === false ? undefined : data.ageGroup,
  );
  setOptional(
    next,
    "location",
    fields.location === false ? undefined : data.location,
  );
  setOptional(next, "cta", data.cta);
  setOptional(next, "studioLogoUrl", data.studioLogoUrl);
  setOptional(next, "studioPrimaryColor", data.studioPrimaryColor);
  return next;
}

export function buildBatchShareCardData(
  batch: BatchShareSource,
  studio: StudioShareSource,
  options?: Partial<ShareCardOptions>,
): BatchShareCardData {
  const danceStyle = danceStyleFromBatch(batch);
  const base: BatchShareCardData = {
    batchName: batch.name.trim() || "Batch",
    headline: options?.headline?.trim() || DEFAULT_SHARE_HEADLINE,
    studioName: studio.name.trim() || "Studio",
  };
  setOptional(base, "coverImageUrl", nonEmpty(batch.coverImageUrl));
  setOptional(base, "danceStyle", danceStyle);
  setOptional(base, "trainerName", trainerNameFromBatch(batch));
  setOptional(base, "schedule", nonEmpty(batch.scheduleLabel));
  setOptional(base, "ageGroup", ageGroupFromCategory(batch.category));
  setOptional(base, "location", locationFromBatch(batch));
  setOptional(base, "cta", options?.cta?.trim() || DEFAULT_SHARE_CTA);
  setOptional(base, "studioLogoUrl", nonEmpty(studio.logoUrl));
  setOptional(base, "studioPrimaryColor", accentFromStyle(danceStyle, studio));

  if (options?.fields) {
    return applyFieldVisibility(base, options.fields);
  }
  return base;
}

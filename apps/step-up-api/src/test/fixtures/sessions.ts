export const FIXTURE_BATCH = {
  id: "batch-kids-1",
  name: "Kids Hip-Hop",
  studioId: "studio-seed-1",
};

export function makeSession(
  overrides: {
    id?: string;
    batchId?: string;
    startsAt?: Date;
    endsAt?: Date;
    batch?: { id: string; name: string; studioId?: string };
  } = {},
) {
  const startsAt = overrides.startsAt ?? new Date("2026-07-20T17:00:00.000Z");
  const endsAt =
    overrides.endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000);
  const batch = overrides.batch ?? FIXTURE_BATCH;

  return {
    id: overrides.id ?? "session-kids-mon",
    batchId: overrides.batchId ?? batch.id,
    startsAt,
    endsAt,
    batch,
  };
}

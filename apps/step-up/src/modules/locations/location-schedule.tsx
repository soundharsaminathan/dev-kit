import { Button } from "@dev-ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import styles from "./location-schedule.module.scss";
import type { BranchLandingBatch } from "./types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduleDayTime = {
  weekday: number;
  startTime: string;
  endTime: string;
};

function scheduleLabel(schedule: unknown): string {
  if (!schedule || typeof schedule !== "object") {
    return "Schedule TBA";
  }
  const s = schedule as {
    frequency?: string;
    weekdays?: number[];
    startTime?: string;
    endTime?: string;
    dayTimes?: ScheduleDayTime[];
  };
  if (!s.startTime || !s.endTime) {
    return "Schedule TBA";
  }
  if (s.frequency === "DAILY") {
    return `Daily · ${s.startTime}–${s.endTime}`;
  }
  const dayTimes = [...(s.dayTimes ?? [])].sort(
    (a, b) => a.weekday - b.weekday,
  );
  if (dayTimes.length > 0) {
    const uniqueRanges = new Set(
      dayTimes.map((slot) => `${slot.startTime}|${slot.endTime}`),
    );
    if (uniqueRanges.size === 1) {
      const first = dayTimes[0];
      if (!first) {
        return `${s.startTime}–${s.endTime}`;
      }
      const days = dayTimes
        .map((slot) => WEEKDAY_LABELS[slot.weekday] ?? "")
        .filter(Boolean)
        .join(", ");
      return days
        ? `${days} · ${first.startTime}–${first.endTime}`
        : `${first.startTime}–${first.endTime}`;
    }
    const parts = dayTimes
      .map((slot) => {
        const label = WEEKDAY_LABELS[slot.weekday] ?? "";
        return label ? `${label} ${slot.startTime}–${slot.endTime}` : null;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  const days = (s.weekdays ?? [])
    .map((d) => WEEKDAY_LABELS[d] ?? "")
    .filter(Boolean)
    .join(", ");
  return days
    ? `${days} · ${s.startTime}–${s.endTime}`
    : `${s.startTime}–${s.endTime}`;
}

function nextOccurrence(schedule: unknown, now: Date): number {
  if (!schedule || typeof schedule !== "object") {
    return Number.POSITIVE_INFINITY;
  }
  const s = schedule as {
    frequency?: string;
    weekdays?: number[];
    startTime?: string;
    dayTimes?: ScheduleDayTime[];
  };
  if (!s.startTime) {
    return Number.POSITIVE_INFINITY;
  }
  const weekdays =
    s.frequency === "DAILY" ? [0, 1, 2, 3, 4, 5, 6] : (s.weekdays ?? []);
  if (weekdays.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    const weekday = candidate.getDay();
    if (!weekdays.includes(weekday)) continue;
    const slot = s.dayTimes?.find((entry) => entry.weekday === weekday);
    const timeValue = slot?.startTime ?? s.startTime;
    const [rawHours, rawMinutes] = timeValue.split(":").map(Number);
    const hours = rawHours ?? Number.NaN;
    const minutes = Number.isFinite(rawMinutes) ? (rawMinutes as number) : 0;
    if (!Number.isFinite(hours)) continue;
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() >= now.getTime()) {
      return candidate.getTime();
    }
  }
  return Number.POSITIVE_INFINITY;
}

function BatchMedia({
  name,
  coverImageUrl,
}: {
  name: string;
  coverImageUrl: string | null;
}) {
  if (coverImageUrl) {
    return (
      <img
        src={coverImageUrl}
        alt=""
        className={styles.mediaFill}
        loading="lazy"
        draggable={false}
      />
    );
  }
  return (
    <span className={styles.mediaFallback} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

type LocationScheduleProps = {
  batches: BranchLandingBatch[];
  batchLinkTo: (batchId: string) => string;
  limit?: number;
  viewAllTo?: string;
};

export function LocationSchedule({
  batches,
  batchLinkTo,
  limit,
  viewAllTo,
}: LocationScheduleProps) {
  const navigate = useNavigate();

  const visible = useMemo(() => {
    if (limit == null || batches.length <= limit) {
      return batches;
    }
    const now = new Date();
    return batches
      .map((batch) => ({
        batch,
        next: nextOccurrence(batch.scheduleJson, now),
      }))
      .sort((a, b) => a.next - b.next)
      .slice(0, limit)
      .map((entry) => entry.batch);
  }, [batches, limit]);

  if (batches.length === 0) {
    return (
      <section className={styles.root}>
        <h2 className={styles.heading}>Classes</h2>
        <p className={styles.empty}>No active classes at this location yet.</p>
      </section>
    );
  }

  const truncated = visible.length < batches.length;

  const items: ExpandableBentoItem[] = visible.map((batch) => {
    const rating =
      batch.ratingAvg != null && batch.ratingCount > 0
        ? `${batch.ratingAvg.toFixed(1)}★ (${batch.ratingCount})`
        : null;

    return {
      id: batch.id,
      title: batch.name,
      subtitle: scheduleLabel(batch.scheduleJson),
      description: [batch.category, rating].filter(Boolean).join(" · "),
      media: (
        <BatchMedia name={batch.name} coverImageUrl={batch.coverImageUrl} />
      ),
      actionLabel: "Open class",
      onAction: () => {
        void navigate({ to: batchLinkTo(batch.id) });
      },
      content: (
        <div className={styles.body}>
          <div className={styles.block}>
            <p className={styles.blockLabel}>Schedule</p>
            <p className={styles.blockValue}>
              {scheduleLabel(batch.scheduleJson)}
            </p>
          </div>
          <div className={styles.block}>
            <p className={styles.blockLabel}>Seats</p>
            <p className={styles.blockValue}>
              {batch.enrollmentCount} of {batch.capacity} filled
            </p>
          </div>
        </div>
      ),
    };
  });

  return (
    <section className={styles.root}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          {truncated ? "Next classes" : "Classes"}
        </h2>
        {truncated && viewAllTo ? (
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              void navigate({ to: viewAllTo });
            }}
          >
            View all {batches.length}
          </Button>
        ) : null}
      </div>
      <ExpandableBentoGrid
        items={items}
        aria-label="Classes at this location"
      />
    </section>
  );
}

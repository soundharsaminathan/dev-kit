import { Badge } from "@dev-ui/components/badge";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { ElasticAvatarStack } from "@/modules/ui/elastic-avatar-stack";
import styles from "./batch-overview.module.scss";
import {
  type BatchOverviewEnrollment,
  type BatchOverviewSession,
  enrollmentModeLabel,
  fillPercent,
  formatNextSessionLabel,
  nextUpcomingSession,
  occupiedSeatsForOverview,
} from "./batch-overview-helpers";

export type {
  BatchOverviewEnrollment,
  BatchOverviewSession,
} from "./batch-overview-helpers";
export {
  enrollmentModeLabel,
  fillPercent,
  formatNextSessionLabel,
  nextUpcomingSession,
  occupiedSeatsForOverview,
} from "./batch-overview-helpers";

export type BatchOverviewTrainer = {
  id: string;
  name: string;
  photoUrl?: string | null | undefined;
};

export type BatchOverviewProps = {
  name: string;
  coverImageUrl?: string | null | undefined;
  active: boolean;
  capacity: number;
  enrollmentMode?: "STAFF_ONLY" | "SELF_JOIN" | undefined;
  occupiedSeats?: number | undefined;
  remainingSeats?: number | undefined;
  enrollmentCount?: number | undefined;
  enrollments?: BatchOverviewEnrollment[] | undefined;
  scheduleLabel?: string | null | undefined;
  branchName?: string | null | undefined;
  sessions?: BatchOverviewSession[] | undefined;
  trainers?: BatchOverviewTrainer[] | undefined;
};

export function BatchOverview({
  name,
  coverImageUrl,
  active,
  capacity,
  enrollmentMode,
  occupiedSeats,
  remainingSeats,
  enrollmentCount,
  enrollments,
  scheduleLabel,
  branchName,
  sessions,
  trainers = [],
}: BatchOverviewProps) {
  const occupied = occupiedSeatsForOverview({
    occupiedSeats,
    remainingSeats,
    capacity,
    enrollmentCount,
    enrollmentsLength: enrollments?.length,
  });
  const seatsLeft =
    typeof remainingSeats === "number"
      ? remainingSeats
      : Math.max(0, capacity - occupied);
  const percent = fillPercent(occupied, capacity);
  const next = nextUpcomingSession(sessions);
  const modeLabel = enrollmentModeLabel(enrollmentMode);
  const isFull = seatsLeft === 0;
  const isLow = !isFull && seatsLeft <= 3;
  const metaParts = [branchName, scheduleLabel, modeLabel].filter(Boolean);
  const trainerItems = trainers.map((trainer) => ({
    id: trainer.id,
    name: trainer.name,
    image: trainer.photoUrl,
  }));

  return (
    <section className={styles.root} aria-label="Batch overview">
      <div className={styles.identity}>
        <div className={styles.cover} aria-hidden>
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className={styles.coverImg}
              loading="lazy"
            />
          ) : (
            <div className={styles.coverFallback}>
              <Icon name={ENTITY_ICONS.batch} />
            </div>
          )}
        </div>
        <div className={styles.copy}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{name}</h2>
            <Badge appearance="subtle" variant={active ? "success" : "neutral"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {metaParts.length > 0 ? (
            <p className={styles.meta}>{metaParts.join(" · ")}</p>
          ) : null}
          {trainerItems.length > 0 ? (
            <div className={styles.trainers}>
              <span className={styles.trainersLabel}>Trainers</span>
              <ElasticAvatarStack items={trainerItems} itemSize={28} />
              <div className={styles.trainerNames}>
                {trainers.map((trainer) => (
                  <Link
                    key={trainer.id}
                    to="/users/$id"
                    params={{ id: trainer.id }}
                    className={styles.trainerChip}
                  >
                    {trainer.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.fill}>
        <div className={styles.fillLabel}>
          <span>Fill</span>
          <span className={styles.fillValue}>
            {occupied}/{capacity} · {percent}%
          </span>
        </div>
        <div className={styles.fillTrack} aria-hidden>
          <div
            className={styles.fillBar}
            style={{ width: `${percent}%` }}
            data-full={isFull ? "true" : undefined}
            data-low={isLow ? "true" : undefined}
          />
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Occupied</span>
          <span className={styles.metricValue}>{occupied}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Seats left</span>
          <span
            className={styles.metricValue}
            data-tone={isFull ? "danger" : undefined}
          >
            {isFull ? "Full" : seatsLeft}
          </span>
        </div>
        {next ? (
          <Link
            to="/app/sessions/$id/attendance"
            params={{ id: next.id }}
            className={styles.metric}
            data-interactive="true"
          >
            <span className={styles.metricLabel}>Next session</span>
            <span className={styles.metricValue}>
              {formatNextSessionLabel(next.startsAt)}
            </span>
          </Link>
        ) : (
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Next session</span>
            <span className={styles.metricValue} data-tone="muted">
              None upcoming
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

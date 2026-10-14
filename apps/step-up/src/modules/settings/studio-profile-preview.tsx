import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";
import { Icon, type IconName } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  currentHoursStatus,
  formatTimeLabel,
  normalizeHours,
} from "@/modules/locations/location-edit-draft";
import {
  AMENITY_OPTIONS,
  type OpeningHours,
  type StudioBranch,
  WEEKDAY_LABELS,
} from "@/modules/locations/types";
import {
  type CompletionItem,
  locationLabel,
  type ProfileValues,
} from "./studio-profile-model";
import styles from "./studio-profile-preview.module.scss";

const AMENITY_ICONS: Record<string, IconName> = {
  parking: "map-pin",
  ac: "sun",
  lockers: "lock",
  showers: "sparkles",
  wifi: "wifi",
  water: "cloud",
  changing_rooms: "users",
  waiting_area: "home",
};

const AMENITY_SHORT: Record<string, string> = {
  parking: "Parking",
  ac: "AC",
  lockers: "Lockers",
  showers: "Showers",
  wifi: "Wi-Fi",
  water: "Drinking water",
  changing_rooms: "Changing rooms",
  waiting_area: "Waiting area",
};

const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function amenityLabel(id: string) {
  return (
    AMENITY_SHORT[id] ??
    AMENITY_OPTIONS.find((option) => option.id === id)?.label ??
    id
  );
}

function studentHourGroups(hours: OpeningHours) {
  const days = [...(normalizeHours(hours).days ?? [])].sort(
    (a, b) => a.day - b.day,
  );
  const groups: { start: number; end: number; value: string }[] = [];

  for (const day of days) {
    const value = day.closed
      ? "Closed"
      : day.open && day.close
        ? `${formatTimeLabel(day.open)} – ${formatTimeLabel(day.close)}`
        : "—";
    const last = groups.at(-1);
    if (last && last.value === value && last.end === day.day - 1) {
      last.end = day.day;
    } else {
      groups.push({ start: day.day, end: day.day, value });
    }
  }

  return groups.map((group) => ({
    label:
      group.start === group.end
        ? (WEEKDAY_LABELS[group.start] ?? WEEKDAY_SHORT[group.start] ?? "")
        : `${WEEKDAY_SHORT[group.start]}–${WEEKDAY_SHORT[group.end]}`,
    value: group.value,
  }));
}

type StudioProfilePreviewProps = {
  studioId: string;
  values: ProfileValues;
  coverUrls: string[];
  branch: StudioBranch | null;
};

export function StudioProfilePreview({
  studioId,
  values,
  coverUrls,
  branch,
}: StudioProfilePreviewProps) {
  const [coverIndex, setCoverIndex] = useState(0);
  const hours = branch?.openingHours ?? null;
  const status = hours
    ? currentHoursStatus(hours)
    : { open: false, label: "Hours not set" };
  const groups = hours ? studentHourGroups(hours) : [];
  const amenities = (branch?.amenities ?? []).slice(0, 6);
  const place = locationLabel(values.address) || "Add a studio address";
  const cover = coverUrls[coverIndex] ?? null;
  const about = values.about.trim() || values.tagline.trim();

  function stepCover(direction: -1 | 1) {
    if (coverUrls.length < 2) return;
    setCoverIndex(
      (current) => (current + direction + coverUrls.length) % coverUrls.length,
    );
  }

  return (
    <article className={styles.preview} data-testid="studio-profile-preview">
      <header className={styles.previewHeader}>
        <Icon name="eye" />
        <div>
          <h2 className={styles.previewTitle}>Public profile preview</h2>
          <p className={styles.previewHint}>
            This is how your studio appears to students.
          </p>
        </div>
      </header>

      <div className={styles.phone}>
        <div className={styles.cover}>
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <div className={styles.coverFallback} aria-hidden>
              <Icon name="image" />
            </div>
          )}
          {coverUrls.length > 1 ? (
            <>
              <button
                type="button"
                className={styles.coverNav}
                data-side="prev"
                aria-label="Previous photo"
                onClick={() => stepCover(-1)}
              >
                <Icon name="chevron-left" />
              </button>
              <button
                type="button"
                className={styles.coverNav}
                data-side="next"
                aria-label="Next photo"
                onClick={() => stepCover(1)}
              >
                <Icon name="chevron-right" />
              </button>
              <div className={styles.dots}>
                {coverUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    className={styles.dot}
                    data-active={index === coverIndex ? "true" : undefined}
                    aria-label={`Show photo ${index + 1}`}
                    onClick={() => setCoverIndex(index)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.body}>
          <h3 className={styles.name}>{values.name.trim() || "Studio name"}</h3>
          <p className={styles.place}>
            <Icon name="map-pin" />
            <span>{place}</span>
          </p>
          <p
            className={styles.status}
            data-open={status.open ? "true" : undefined}
          >
            <span className={styles.statusDot} aria-hidden />
            {status.label.replace("–", " – ")}
          </p>

          {amenities.length > 0 ? (
            <div>
              <p className={styles.sectionLabel}>Amenities</p>
              <ul className={styles.chips}>
                {amenities.map((id) => (
                  <li key={id}>
                    <Icon name={AMENITY_ICONS[id] ?? "check"} />
                    {amenityLabel(id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups.length > 0 ? (
            <div>
              <p className={styles.sectionLabel}>Opening hours</p>
              <ul className={styles.hours}>
                {groups.map((group) => (
                  <li key={group.label}>
                    <span>{group.label}</span>
                    <span>{group.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {about ? (
            <div>
              <p className={styles.sectionLabel}>About</p>
              <p className={styles.about}>{about}</p>
            </div>
          ) : null}

          <Link
            to="/studio/$studioId"
            params={{ studioId }}
            target="_blank"
            className={styles.publicLink}
          >
            View public page
            <Icon name="arrow-up-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}

type StudioProfileCompletionProps = {
  percent: number;
  items: CompletionItem[];
  title?: string;
};

export function StudioProfileCompletion({
  percent,
  items,
  title = "Profile completion",
}: StudioProfileCompletionProps) {
  const done = items.filter((item) => item.done);
  const todo = items.filter((item) => !item.done);

  return (
    <section
      className={styles.completion}
      data-testid="studio-profile-completion"
    >
      <div className={styles.completionHead}>
        <h2 className={styles.completionTitle}>{title}</h2>
        <p className={styles.percent}>{percent}%</p>
      </div>
      <ProgressBar value={percent} maxValue={100} aria-label={title}>
        <ProgressBarTrack>
          <ProgressBarFill />
        </ProgressBarTrack>
      </ProgressBar>
      {done.length > 0 ? (
        <div>
          <p className={styles.sectionLabel}>Completed</p>
          <ul className={styles.checklist}>
            {done.map((item) => (
              <li key={item.id} data-done="true">
                <Icon name="check-circle" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {todo.length > 0 ? (
        <div>
          <p className={styles.sectionLabel}>Incomplete</p>
          <ul className={styles.checklist}>
            {todo.map((item) => (
              <li key={item.id}>
                <Icon name="circle" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

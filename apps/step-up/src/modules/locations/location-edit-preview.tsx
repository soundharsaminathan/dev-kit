import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import {
  type CompletionItem,
  currentHoursStatus,
  groupOpeningHours,
  type LocationEditDraft,
} from "./location-edit-draft";
import styles from "./location-edit-preview.module.scss";
import { AMENITY_OPTIONS } from "./types";

type LocationEditPreviewProps = {
  branchId: string;
  coverUrl: string | null;
  draft: LocationEditDraft;
};

export function LocationEditPreview({
  branchId,
  coverUrl,
  draft,
}: LocationEditPreviewProps) {
  const status = currentHoursStatus(draft.hours);
  const groups = groupOpeningHours(draft.hours);
  const amenityLabels = draft.amenities
    .map(
      (id) => AMENITY_OPTIONS.find((option) => option.id === id)?.label ?? id,
    )
    .slice(0, 6);

  return (
    <article className={styles.preview} data-testid="location-edit-preview">
      <header className={styles.previewHeader}>
        <Icon name="eye" />
        <div>
          <h2 className={styles.previewTitle}>Public location preview</h2>
          <p className={styles.previewHint}>
            How this location appears to students
          </p>
        </div>
      </header>

      <div className={styles.phone}>
        <div className={styles.cover}>
          {coverUrl ? (
            <img src={coverUrl} alt="" />
          ) : (
            <div className={styles.coverFallback} aria-hidden>
              <Icon name="image" />
            </div>
          )}
        </div>

        <div className={styles.body}>
          <h3 className={styles.name}>
            {draft.name.trim() || "Untitled location"}
          </h3>
          <p className={styles.address}>
            <Icon name="map-pin" />
            <span>{draft.address.trim() || "Add an address"}</span>
          </p>
          <p
            className={styles.status}
            data-open={status.open ? "true" : undefined}
          >
            <span className={styles.dot} aria-hidden />
            {status.label}
          </p>

          {amenityLabels.length > 0 ? (
            <div>
              <p className={styles.sectionLabel}>Amenities</p>
              <ul className={styles.chips}>
                {amenityLabels.map((label) => (
                  <li key={label}>{label}</li>
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

          <Link
            to="/app/locations/$id"
            params={{ id: branchId }}
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

type LocationEditCompletionProps = {
  percent: number;
  items: CompletionItem[];
};

export function LocationEditCompletion({
  percent,
  items,
}: LocationEditCompletionProps) {
  return (
    <section className={styles.completion}>
      <div className={styles.completionHead}>
        <h2 className={styles.completionTitle}>Completion</h2>
        <p className={styles.percent}>{percent}%</p>
      </div>
      <ProgressBar
        value={percent}
        maxValue={100}
        aria-label="Profile completion"
      >
        <ProgressBarTrack>
          <ProgressBarFill />
        </ProgressBarTrack>
      </ProgressBar>
      <ul className={styles.checklist}>
        {items.map((item) => (
          <li key={item.id} data-done={item.done ? "true" : undefined}>
            <Icon name={item.done ? "check-circle" : "circle"} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <p className={styles.completionHint}>
        Additional profile content helps students learn more about your studio.
      </p>
    </section>
  );
}

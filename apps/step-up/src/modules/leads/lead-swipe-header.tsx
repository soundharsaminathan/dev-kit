import styles from "./leads.module.scss";
import { type LeadSection, SECTION_LABELS, SECTION_ORDER } from "./types";

type LeadSwipeHeaderProps = {
  activeSection: LeadSection;
  onSelectSection: (section: LeadSection) => void;
};

export function LeadSwipeHeader({
  activeSection,
  onSelectSection,
}: LeadSwipeHeaderProps) {
  const index = SECTION_ORDER.indexOf(activeSection);
  const prev = index > 0 ? (SECTION_ORDER[index - 1] ?? null) : null;
  const next =
    index < SECTION_ORDER.length - 1
      ? (SECTION_ORDER[index + 1] ?? null)
      : null;

  return (
    <div className={styles.swipeHeader} data-testid="leads-swipe-header">
      <button
        type="button"
        className={styles.swipeSlot}
        data-slot="prev"
        data-testid="leads-swipe-prev"
        aria-label={
          prev ? `Previous section: ${SECTION_LABELS[prev]}` : "First section"
        }
        disabled={!prev}
        onClick={() => {
          if (prev) onSelectSection(prev);
        }}
      >
        {prev ? SECTION_LABELS[prev] : ""}
      </button>
      <span className={styles.swipeCurrent} data-testid="leads-swipe-current">
        {SECTION_LABELS[activeSection]}
      </span>
      <button
        type="button"
        className={styles.swipeSlot}
        data-slot="next"
        data-testid="leads-swipe-next"
        aria-label={
          next ? `Next section: ${SECTION_LABELS[next]}` : "Last section"
        }
        disabled={!next}
        onClick={() => {
          if (next) onSelectSection(next);
        }}
      >
        {next ? SECTION_LABELS[next] : ""}
      </button>
    </div>
  );
}

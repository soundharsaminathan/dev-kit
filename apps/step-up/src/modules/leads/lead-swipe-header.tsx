import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
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
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      `[data-section="${activeSection}"]`,
    );
    active?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeSection, reduce]);

  return (
    <div
      ref={listRef}
      className={styles.swipeHeader}
      role="tablist"
      aria-label="Lead pipeline sections"
      data-testid="leads-swipe-header"
    >
      {SECTION_ORDER.map((section) => {
        const selected = section === activeSection;
        return (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={selected}
            className={styles.swipeTab}
            data-selected={selected ? "true" : undefined}
            data-section={section}
            data-testid={selected ? "leads-swipe-current" : undefined}
            onClick={() => {
              if (!selected) onSelectSection(section);
            }}
          >
            {SECTION_LABELS[section]}
          </button>
        );
      })}
    </div>
  );
}

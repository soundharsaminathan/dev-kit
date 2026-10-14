import { Icon } from "@dev-ui/icons";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./filter-chip-row.module.scss";

export type FilterChip = {
  id: string;
  label: string;
};

type FilterChipRowProps = {
  chips: FilterChip[];
  selected: string[];
  onToggle: (id: string) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function FilterChipRow({
  chips,
  selected,
  onToggle,
  leading,
  trailing,
}: FilterChipRowProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateOverflow() {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;
    setCanScrollLeft(left > 1);
    setCanScrollRight(max > 1 && left < max - 1);
  }

  useLayoutEffect(() => {
    updateOverflow();
  }, [chips, selected]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateOverflow();
    el.addEventListener("scroll", updateOverflow, { passive: true });
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    for (const child of el.children) {
      observer.observe(child);
    }

    return () => {
      el.removeEventListener("scroll", updateOverflow);
      observer.disconnect();
    };
  }, [chips]);

  function scrollByDirection(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(120, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div
      className={styles.row}
      data-can-scroll-left={canScrollLeft ? "true" : undefined}
      data-can-scroll-right={canScrollRight ? "true" : undefined}
    >
      {leading}
      <div className={styles.scroller}>
        <ul ref={scrollRef} className={styles.scroll}>
          {chips.map((chip) => {
            const active = selected.includes(chip.id);
            return (
              <li key={chip.id}>
                <button
                  type="button"
                  className={
                    active ? `${styles.chip} ${styles.chipActive}` : styles.chip
                  }
                  aria-pressed={active}
                  onClick={() => onToggle(chip.id)}
                >
                  {chip.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.fadeLeft} aria-hidden />
        <div className={styles.fadeRight} aria-hidden />

        {canScrollLeft ? (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            aria-label="Show previous filters"
            onClick={() => scrollByDirection(-1)}
          >
            <Icon name="chevron-left" className={styles.arrowIcon} />
          </button>
        ) : null}

        {canScrollRight ? (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            aria-label="Show more filters"
            onClick={() => scrollByDirection(1)}
          >
            <Icon name="chevron-right" className={styles.arrowIcon} />
          </button>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

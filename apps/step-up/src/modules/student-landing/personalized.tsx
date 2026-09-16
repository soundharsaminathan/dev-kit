import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { fetchDiscoverStudios } from "./api";
import { STUDENT_PERSONALIZED } from "./content";
import styles from "./personalized.module.scss";
import { StudioCard, StudioCardSkeleton } from "./studio-card";
import type { DiscoverStudiosQuery } from "./types";

type Chip =
  | { id: string; label: string; patch: Partial<DiscoverStudiosQuery> }
  | { id: string; label: string; clear: true };

const CHIPS: Chip[] = [
  { id: "all", label: "All", clear: true },
  { id: "kids", label: "Age: kids", patch: { audience: "KIDS" } },
  { id: "adults", label: "Age: adults", patch: { audience: "ADULTS" } },
  { id: "weekday", label: "Weekday", patch: { days: "weekday" } },
  { id: "weekend", label: "Weekend", patch: { days: "weekend" } },
  { id: "morning", label: "Morning", patch: { time: "morning" } },
  { id: "evening", label: "Evening", patch: { time: "evening" } },
  { id: "near", label: "Within 5 km", patch: { maxKm: 5 } },
  { id: "budget", label: "Under ₹3,000", patch: { maxPrice: 3000 } },
];

export function StudentPersonalized() {
  const [active, setActive] = useState<string>("all");
  const filters = useMemo((): DiscoverStudiosQuery => {
    const chip = CHIPS.find((item) => item.id === active);
    if (!chip || "clear" in chip) return { limit: 6 };
    return { limit: 6, ...chip.patch };
  }, [active]);

  const studiosQuery = useQuery({
    queryKey: ["discover-studios", filters],
    queryFn: () => fetchDiscoverStudios(filters),
    staleTime: 30_000,
  });

  return (
    <section
      className={`${shared.section} ${styles.section}`}
      aria-labelledby="personalized-headline"
    >
      <div className={shared.sectionInner}>
        <Reveal>
          <h2 id="personalized-headline" className={shared.title}>
            {STUDENT_PERSONALIZED.headline}
          </h2>
          <p className={shared.lede}>{STUDENT_PERSONALIZED.support}</p>
        </Reveal>

        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={styles.chip}
              data-active={active === chip.id || undefined}
              aria-pressed={active === chip.id}
              onClick={() => setActive(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {studiosQuery.isLoading ? (
          <div className={styles.grid}>
            {["a", "b", "c"].map((id) => (
              <StudioCardSkeleton key={id} />
            ))}
          </div>
        ) : null}

        {studiosQuery.data && studiosQuery.data.length > 0 ? (
          <div className={styles.grid}>
            {studiosQuery.data.map((studio) => (
              <StudioCard key={studio.id} studio={studio} />
            ))}
          </div>
        ) : null}

        {studiosQuery.data && studiosQuery.data.length === 0 ? (
          <p className={styles.empty}>
            No studios match these preferences yet. Try another filter.
          </p>
        ) : null}
      </div>
    </section>
  );
}

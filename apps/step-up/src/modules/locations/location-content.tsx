import styles from "./location-content.module.scss";
import {
  AMENITY_OPTIONS,
  type BranchFaq,
  type BranchTestimonial,
  type OpeningHours,
  WEEKDAY_LABELS,
} from "./types";

export function LocationAmenities({ amenities }: { amenities: string[] }) {
  if (amenities.length === 0) {
    return null;
  }

  const labels = amenities.map(
    (id) => AMENITY_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Amenities</h2>
      <ul className={styles.amenityList}>
        {labels.map((label) => (
          <li key={label} className={styles.amenity}>
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LocationHours({ hours }: { hours: OpeningHours | null }) {
  if (!hours?.days?.length && !hours?.notes) {
    return null;
  }

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Hours</h2>
      {hours.days?.length ? (
        <ul className={styles.hoursList}>
          {hours.days.map((day) => (
            <li key={day.day} className={styles.hoursRow}>
              <span>{WEEKDAY_LABELS[day.day] ?? `Day ${day.day}`}</span>
              <span>
                {day.closed
                  ? "Closed"
                  : day.open && day.close
                    ? `${day.open}–${day.close}`
                    : "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {hours.notes ? <p className={styles.notes}>{hours.notes}</p> : null}
    </section>
  );
}

export function LocationPricing({ blurb }: { blurb: string | null }) {
  if (!blurb) {
    return null;
  }

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Membership</h2>
      <p className={styles.body}>{blurb}</p>
    </section>
  );
}

export function LocationFaqs({ faqs }: { faqs: BranchFaq[] }) {
  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>FAQs</h2>
      <div className={styles.faqList}>
        {faqs.map((faq) => (
          <details key={faq.id} className={styles.faq}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LocationTestimonials({
  testimonials,
}: {
  testimonials: BranchTestimonial[];
}) {
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>What students say</h2>
      <ul className={styles.quoteList}>
        {testimonials.map((item) => (
          <li key={item.id} className={styles.quote}>
            <p className={styles.quoteText}>“{item.quote}”</p>
            <p className={styles.quoteMeta}>
              {item.authorName}
              {item.rating != null ? ` · ${item.rating}★` : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

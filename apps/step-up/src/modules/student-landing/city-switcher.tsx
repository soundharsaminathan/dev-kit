import { useEffect, useId, useState } from "react";
import { useDiscoverCity } from "./city-context";
import styles from "./city-switcher.module.scss";
import { STUDENT_CITY } from "./content";

export function CitySwitcher() {
  const { cityId, cityLabel, cities, selectCity } = useDiscoverCity();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.dot} aria-hidden />
        <span>{cityLabel}</span>
        <span className={styles.caret} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={styles.dialogHead}>
            <h2 id={titleId} className={styles.title}>
              {STUDENT_CITY.pickerTitle}
            </h2>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <p className={styles.hint}>{STUDENT_CITY.liveHint}</p>
          <ul className={styles.list}>
            {cities.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  className={styles.city}
                  data-active={city.id === cityId || undefined}
                  data-soon={!city.available || undefined}
                  disabled={!city.available}
                  onClick={() => {
                    if (selectCity(city.id)) setOpen(false);
                  }}
                >
                  <span>{city.label}</span>
                  {city.available ? null : (
                    <span className={styles.soon}>
                      {STUDENT_CITY.comingSoon}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {open ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close city picker"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

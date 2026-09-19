import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from "@/modules/marketing/icons";
import { useDiscoverCity } from "./city-context";
import { CityLandmarkIcon } from "./city-icons";
import styles from "./city-switcher.module.scss";
import { STUDENT_CITY } from "./content";

const CHENNAI_BOUNDS = {
  minLat: 12.7,
  maxLat: 13.4,
  minLng: 79.9,
  maxLng: 80.45,
};

function isChennaiPoint(lat: number, lng: number) {
  return (
    lat >= CHENNAI_BOUNDS.minLat &&
    lat <= CHENNAI_BOUNDS.maxLat &&
    lng >= CHENNAI_BOUNDS.minLng &&
    lng <= CHENNAI_BOUNDS.maxLng
  );
}

export function CitySwitcher() {
  const { cityId, cityLabel, cities, selectCity } = useDiscoverCity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);
  const titleId = useId();
  const searchId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter((city) => city.label.toLowerCase().includes(needle));
  }, [cities, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setGeoHint(null);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setGeoHint(null);
    triggerRef.current?.focus();
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoHint(STUDENT_CITY.detectHint);
      return;
    }
    setGeoPending(true);
    setGeoHint(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPending(false);
        if (
          isChennaiPoint(position.coords.latitude, position.coords.longitude)
        ) {
          if (selectCity("chennai")) close();
          return;
        }
        setGeoHint(STUDENT_CITY.detectHint);
      },
      () => {
        setGeoPending(false);
        setGeoHint(STUDENT_CITY.detectHint);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const picker =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className={styles.backdrop}
              aria-label="Close city picker"
              onClick={close}
            />
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
                <button type="button" className={styles.close} onClick={close}>
                  Close
                </button>
              </div>

              <div className={styles.search}>
                <MagnifyingGlassIcon className={styles.searchIcon ?? ""} />
                <input
                  id={searchId}
                  ref={searchRef}
                  className={styles.searchInput}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={STUDENT_CITY.searchPlaceholder}
                  aria-label={STUDENT_CITY.searchPlaceholder}
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                className={styles.detect}
                onClick={detectLocation}
                disabled={geoPending}
              >
                <MapPinIcon className={styles.detectIcon ?? ""} />
                <span>
                  {geoPending ? STUDENT_CITY.detecting : STUDENT_CITY.detect}
                </span>
              </button>
              {geoHint ? <p className={styles.hint}>{geoHint}</p> : null}

              <p className={styles.sectionLabel}>{STUDENT_CITY.popular}</p>
              {filtered.length > 0 ? (
                <ul className={styles.grid}>
                  {filtered.map((city) => (
                    <li key={city.id}>
                      <button
                        type="button"
                        className={styles.tile}
                        data-active={city.id === cityId || undefined}
                        data-soon={!city.available || undefined}
                        disabled={!city.available}
                        onClick={() => {
                          if (selectCity(city.id)) close();
                        }}
                      >
                        <span className={styles.iconWrap}>
                          <CityLandmarkIcon
                            id={city.id}
                            className={styles.icon}
                            title={city.label}
                          />
                        </span>
                        <span className={styles.tileName}>{city.label}</span>
                        <span
                          className={styles.soon}
                          data-visible={!city.available || undefined}
                          aria-hidden={city.available || undefined}
                        >
                          {STUDENT_CITY.comingSoon}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>{STUDENT_CITY.empty}</p>
              )}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MapPinIcon className={styles.triggerIcon ?? ""} />
        <span>{cityLabel}</span>
        <CaretDownIcon className={styles.caret ?? ""} />
      </button>
      {picker}
    </div>
  );
}

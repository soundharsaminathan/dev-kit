import { Button } from "@dev-ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import shared from "@/modules/marketing/marketing.module.scss";
import { useDiscoverCity } from "./city-context";
import { STUDENT_HERO } from "./content";
import styles from "./hero.module.scss";
import { useDiscoverLanding } from "./use-landing";

const FALLBACK_STYLE_CHIPS = [
  { id: "hip-hop", label: "Hip hop" },
  { id: "bharatanatyam", label: "Bharatanatyam" },
  { id: "western", label: "Western" },
];

export function StudentHero() {
  const navigate = useNavigate();
  const { cityId, cityLabel } = useDiscoverCity();
  const landing = useDiscoverLanding();
  const [q, setQ] = useState("");
  const [locality, setLocality] = useState("");
  const [audience, setAudience] = useState<"" | "KIDS" | "ADULTS">("");
  const [nearMe, setNearMe] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const areas = landing.data?.areas ?? [];
  const styleChips = FALLBACK_STYLE_CHIPS;

  const goDiscover = (search: {
    q?: string;
    locality?: string;
    audience?: "KIDS" | "ADULTS";
    lat?: number;
    lng?: number;
    maxKm?: number;
  }) => {
    void navigate({
      to: "/discover",
      search: {
        city: cityId,
        category: "dance",
        ...search,
      },
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const search: Parameters<typeof goDiscover>[0] = {};
    const trimmed = q.trim();
    if (trimmed) search.q = trimmed;
    if (locality && !nearMe) search.locality = locality;
    if (audience) search.audience = audience;

    if (nearMe && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          goDiscover({
            ...search,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            maxKm: 8,
          });
        },
        () => {
          setGeoError("Could not read your location. Search the city instead.");
          goDiscover(search);
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
      return;
    }
    goDiscover(search);
  };

  return (
    <section className={styles.hero} aria-labelledby="student-hero-headline">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <h1 id="student-hero-headline" className={styles.headline}>
            {STUDENT_HERO.headline(cityLabel)}
          </h1>
          <p className={`${shared.lede} ${styles.support}`}>
            {STUDENT_HERO.support}
          </p>

          <form className={styles.search} onSubmit={onSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Style</span>
              <input
                className={styles.input}
                type="search"
                name="q"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={STUDENT_HERO.searchPlaceholder}
                autoComplete="off"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Area</span>
              <select
                className={styles.select}
                name="locality"
                value={nearMe ? "near" : locality}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "near") {
                    setNearMe(true);
                    setLocality("");
                    return;
                  }
                  setNearMe(false);
                  setLocality(value);
                }}
              >
                <option value="">{STUDENT_HERO.areaPlaceholder}</option>
                <option value="near">{STUDENT_HERO.nearMe}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" className={styles.submit}>
              {STUDENT_HERO.searchCta}
            </Button>
          </form>

          <div className={styles.audience}>
            {styleChips.map((style) => (
              <Link
                key={style.id}
                to="/discover"
                search={{
                  city: cityId,
                  category: "dance",
                  style: style.id,
                }}
                className={styles.chip}
              >
                {style.label}
              </Link>
            ))}
            {(
              [
                ["KIDS", STUDENT_HERO.kids],
                ["ADULTS", STUDENT_HERO.adults],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={styles.chip}
                data-active={audience === id || undefined}
                aria-pressed={audience === id}
                onClick={() =>
                  setAudience((current) => (current === id ? "" : id))
                }
              >
                {label}
              </button>
            ))}
          </div>

          {geoError ? <p className={styles.geoError}>{geoError}</p> : null}

          <p className={styles.proof}>
            <Link
              to="/discover"
              search={{ city: cityId, category: "dance" }}
              className={styles.proofLink}
            >
              {STUDENT_HERO.proof}
              <span className={styles.proofArrow} aria-hidden>
                →
              </span>
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

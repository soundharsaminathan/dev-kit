import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Baby,
  Dumbbell,
  Lock,
  Music2,
  Palette,
  PersonStanding,
  Search,
  Users,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { PublicShell } from "@/modules/layout/public-shell";
import { Reveal } from "@/modules/marketing/reveal";
import { useDiscoverCity } from "@/modules/student-landing/city-context";
import { CitySwitcher } from "@/modules/student-landing/city-switcher";
import { MARKETPLACE_AREAS } from "./areas";
import type { BookSheetTarget } from "./book";
import { BookSheet } from "./book-sheet";
import {
  MarketplaceClassCardView,
  MarketplaceStudioCardView,
} from "./cards";
import {
  fetchMarketplaceClasses,
  fetchMarketplaceStudios,
  marketplaceClassesQueryKey,
  marketplaceStudiosQueryKey,
} from "./catalog";
import { MarketplaceMap } from "./map";
import { marketplacePinsForItems } from "./place";
import { categoryLabel, writeStoredCategory } from "./search";
import type {
  MarketplaceClassCard,
  MarketplaceStudioCard,
  PublicMarketplaceCategory,
} from "./types";
import { useMarketplaceAuth } from "./use-marketplace-auth";
import styles from "./landing.module.scss";

const CHIP_ICONS = {
  dance: PersonStanding,
  music: Music2,
  fitness: Dumbbell,
  art: Palette,
  kids: Baby,
  adults: Users,
  private: Lock,
} as const;

const QUICK_FILTERS = [
  { id: "DANCE", label: "Dance", kind: "category" as const, tone: "dance" },
  { id: "MUSIC", label: "Music", kind: "category" as const, tone: "music" },
  { id: "FITNESS", label: "Fitness", kind: "category" as const, tone: "fitness" },
  { id: "ART", label: "Art", kind: "category" as const, tone: "art" },
  { id: "KIDS", label: "Kids", kind: "audience" as const, tone: "kids" },
  { id: "ADULTS", label: "Adults", kind: "audience" as const, tone: "adults" },
  {
    id: "PRIVATE",
    label: "Private classes",
    kind: "private" as const,
    tone: "private",
  },
] as const;

const HERO_COLLAGE_BG = "/marketplace/hero-collage-bg.jpg";
const HERO_COLLAGE_BG_DARK = "/marketplace/hero-collage-bg-dark.jpg";

const CATEGORY_CARDS: Array<{
  id: PublicMarketplaceCategory;
  label: string;
  styles: string[];
  image: string;
}> = [
  {
    id: "DANCE",
    label: "Dance",
    styles: ["Bharatanatyam", "Hip hop", "Contemporary"],
    image: "/marketplace/hero-shape-tl-dance.png",
  },
  {
    id: "MUSIC",
    label: "Music",
    styles: ["Guitar", "Keyboard", "Vocal"],
    image: "/marketplace/hero-shape-bc1-guitar.png",
  },
  {
    id: "FITNESS",
    label: "Fitness",
    styles: ["Zumba", "Yoga", "Pilates"],
    image: "/marketplace/hero-shape-bc2-yoga.png",
  },
  {
    id: "ART",
    label: "Art",
    styles: ["Drawing", "Painting", "Crafts"],
    image: "/marketplace/hero-shape-tr-art.png",
  },
];

const TRY_NEW = [
  { id: "hip-hop", label: "Hip hop", category: "DANCE" as const },
  { id: "yoga", label: "Yoga", category: "FITNESS" as const },
  { id: "vocals", label: "Vocals", category: "MUSIC" as const },
  { id: "drawing", label: "Drawing", category: "ART" as const },
  { id: "bharatanatyam", label: "Bharatanatyam", category: "DANCE" as const },
  { id: "guitar", label: "Guitar", category: "MUSIC" as const },
];

function LandingInner() {
  const navigate = useNavigate();
  const { cityId, cityLabel } = useDiscoverCity();
  const { viewerKey, resolveAuth } = useMarketplaceAuth();
  const [q, setQ] = useState("");
  const [popularCategory, setPopularCategory] = useState<
    PublicMarketplaceCategory | "ALL"
  >("ALL");
  const [book, setBook] = useState<BookSheetTarget | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Find your next class in ${cityLabel} | classa`;
  }, [cityLabel]);

  const popularSearch = {
    city: cityId,
    ...(popularCategory === "ALL" ? {} : { category: popularCategory }),
    sort: "popularity" as const,
    limit: 8,
  };

  const classesQuery = useQuery({
    queryKey: marketplaceClassesQueryKey(popularSearch, viewerKey),
    queryFn: async () =>
      fetchMarketplaceClasses(popularSearch, await resolveAuth()),
    staleTime: 60_000,
  });

  const studiosQuery = useQuery({
    queryKey: marketplaceStudiosQueryKey(
      { city: cityId, category: "DANCE", sort: "rating", limit: 6 },
      viewerKey,
    ),
    queryFn: async () =>
      fetchMarketplaceStudios(
        { city: cityId, category: "DANCE", sort: "rating", limit: 6 },
        await resolveAuth(),
      ),
    staleTime: 60_000,
  });

  const popular = (classesQuery.data?.items ?? []).slice(0, 8);
  const featuredStudios = (studiosQuery.data?.items ?? []).slice(0, 4);
  const pins = marketplacePinsForItems(
    studiosQuery.data?.pins ?? [],
    featuredStudios.map((item) => item.id),
  );

  const goBrowse = (search: Record<string, string | undefined>) => {
    void navigate({
      to: "/classes",
      search: {
        city: cityId,
        ...search,
      },
    });
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = q.trim();
    goBrowse(trimmed ? { q: trimmed } : {});
  };

  const bookClass = (item: MarketplaceClassCard) => {
    setBook({
      source: "class",
      studioId: item.studioId,
      studioName: item.studioName,
      batchId: item.id,
      classSlug: item.slug,
      className: item.name,
      audience: item.audience,
      trainerId: item.trainerId,
      trainerName: item.trainerName,
      canTrial: item.canTrial,
      canEnroll: item.canEnroll,
      canPrivate: false,
      canFloorHire: false,
      viewerEnrolled: item.viewerEnrolled,
    });
  };

  const bookStudio = (item: MarketplaceStudioCard) => {
    setBook({
      source: "studio",
      studioId: item.id,
      studioName: item.name,
      studioSlug: item.slug,
      canTrial: item.canTrial,
      canEnroll: item.canEnroll,
      canPrivate: item.canPrivate,
      canFloorHire: item.canFloorHire,
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <img
          className={styles.heroBg}
          src={HERO_COLLAGE_BG}
          alt=""
          aria-hidden
          data-theme="light"
        />
        <img
          className={styles.heroBg}
          src={HERO_COLLAGE_BG_DARK}
          alt=""
          aria-hidden
          data-theme="dark"
        />
        <div className={styles.heroInner}>
          <h1 id="home-hero-title" className={styles.headline}>
            Find your <span className={styles.headlineAccent}>next</span>{" "}
            class.
          </h1>
          <p className={styles.support}>
            Dance, music, fitness and more — discover great classes and trainers
            near you.
          </p>
          <form className={styles.searchBar} onSubmit={onSearch}>
            <div className={styles.citySlot}>
              <CitySwitcher />
            </div>
            <span className={styles.searchDivider} aria-hidden />
            <label className={styles.searchField}>
              <Search aria-hidden className={styles.searchIcon} />
              <span className={styles.srOnly}>Search classes</span>
              <input
                id="marketplace-home-search"
                className={styles.searchInput}
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search dance, studio, trainer..."
                autoComplete="off"
              />
            </label>
            <button type="submit" className={styles.searchCta}>
              Search
            </button>
          </form>
          <div className={styles.quickRow} role="list">
            {QUICK_FILTERS.map((chip) => {
              const Icon = CHIP_ICONS[chip.tone];
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={styles.quickChip}
                  data-tone={chip.tone}
                  role="listitem"
                  onClick={() => {
                    if (chip.kind === "category") {
                      writeStoredCategory(chip.id);
                      goBrowse({ category: chip.id });
                      return;
                    }
                    if (chip.kind === "audience") {
                      goBrowse({ audience: chip.id });
                      return;
                    }
                    goBrowse({ q: "private" });
                  }}
                >
                  <Icon aria-hidden className={styles.quickIcon} />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="areas-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="areas-title" className={styles.sectionTitle}>
                Explore classes in {cityLabel}
              </h2>
              <Link
                to="/classes"
                search={{ city: cityId }}
                className={styles.sectionLink}
              >
                See all
              </Link>
            </div>
          </Reveal>
          <div className={styles.chipRow}>
            {MARKETPLACE_AREAS.map((area) => (
              <Link
                key={area.id}
                to="/$city/$place"
                params={{ city: cityId, place: area.id }}
                className={styles.areaChip}
              >
                {area.label}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="learn-title">
          <Reveal>
            <h2 id="learn-title" className={styles.sectionTitle}>
              What are you looking to learn?
            </h2>
          </Reveal>
          <div className={styles.categoryGrid}>
            {CATEGORY_CARDS.map((item, index) => (
              <Reveal key={item.id} delay={index * 40}>
                <Link
                  to="/classes"
                  search={{ city: cityId, category: item.id }}
                  className={styles.categoryCard}
                  data-cat={item.id}
                  onClick={() => writeStoredCategory(item.id)}
                >
                  <img
                    className={styles.categoryImage}
                    src={item.image}
                    alt=""
                  />
                  <span className={styles.categoryFooter}>
                    <span className={styles.categoryLabel}>{item.label}</span>
                    <span className={styles.categoryStyles}>
                      {item.styles.join(" · ")}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="popular-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <div className={styles.sectionCopy}>
                <h2 id="popular-title" className={styles.sectionTitle}>
                  Popular classes near you
                </h2>
                <p className={styles.sectionSupport}>
                  Great places to start in {cityLabel}
                </p>
              </div>
              <Link
                to="/classes"
                search={{
                  city: cityId,
                  sort: "popularity",
                  ...(popularCategory === "ALL"
                    ? {}
                    : { category: popularCategory }),
                }}
                className={styles.sectionLink}
              >
                View all →
              </Link>
            </div>
          </Reveal>
          <div className={styles.filterRow} role="list">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "DANCE", label: "Dance" },
                { id: "MUSIC", label: "Music" },
                { id: "FITNESS", label: "Fitness" },
                { id: "ART", label: "Art" },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="listitem"
                className={styles.filterChip}
                data-active={popularCategory === chip.id ? "true" : undefined}
                aria-pressed={popularCategory === chip.id}
                onClick={() => setPopularCategory(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          {classesQuery.isLoading ? (
            <p className={styles.hint}>Loading popular classes</p>
          ) : null}
          {classesQuery.isError ? (
            <p className={styles.hint}>
              Could not load classes. Start the API (`pnpm dev:step-up-api`) and
              refresh.
            </p>
          ) : null}
          {!classesQuery.isLoading &&
          !classesQuery.isError &&
          popular.length === 0 ? (
            <p className={styles.hint}>
              {popularCategory === "ALL"
                ? `Classes in ${cityLabel} are coming soon.`
                : `${categoryLabel(popularCategory)} classes in ${cityLabel} are coming soon.`}
            </p>
          ) : null}
          {popular.length > 0 ? (
            <div className={styles.cardRail}>
              {popular.map((item) => (
                <div key={item.id} className={styles.railCard}>
                  <MarketplaceClassCardView item={item} onBook={bookClass} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="map-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="map-title" className={styles.sectionTitle}>
                Find classes near you
              </h2>
              <Link
                to="/classes"
                search={{ city: cityId, view: "map" }}
                className={styles.sectionLink}
              >
                Open map
              </Link>
            </div>
          </Reveal>
          <div className={styles.mapSplit}>
            <div className={styles.mapList}>
              {studiosQuery.isError ? (
                <p className={styles.hint}>Could not load nearby studios.</p>
              ) : null}
              {featuredStudios.length === 0 &&
              !studiosQuery.isLoading &&
              !studiosQuery.isError ? (
                <p className={styles.hint}>Studios will appear here soon.</p>
              ) : null}
              {featuredStudios.map((item) => (
                <div key={item.id} className={styles.mapListCard}>
                  <MarketplaceStudioCardView item={item} onBook={bookStudio} />
                </div>
              ))}
            </div>
            <div className={styles.mapPane}>
              <MarketplaceMap
                pins={pins}
                selectedId={selectedPin}
                onSelect={(pin) => setSelectedPin(pin.id)}
              />
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="try-title">
          <Reveal>
            <h2 id="try-title" className={styles.sectionTitle}>
              Try something new
            </h2>
          </Reveal>
          <div className={styles.chipRow}>
            {TRY_NEW.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.areaChip}
                onClick={() => {
                  writeStoredCategory(item.category);
                  goBrowse({ category: item.category, q: item.label });
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <BookSheet
        open={Boolean(book)}
        onOpenChange={(open) => {
          if (!open) setBook(null);
        }}
        target={book}
      />
    </div>
  );
}

export function MarketplaceLanding() {
  return (
    <PublicShell nav="student" width="full">
      <LandingInner />
    </PublicShell>
  );
}

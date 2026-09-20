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
  Signal,
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
import { MarketplaceStudioCardView } from "./cards";
import {
  fetchMarketplaceClasses,
  fetchMarketplaceStudios,
  marketplaceClassesQueryKey,
  marketplaceStudiosQueryKey,
} from "./catalog";
import { MarketplaceMap } from "./map";
import { marketplacePinsForItems } from "./place";
import { categoryLabel, writeStoredCategory } from "./search";
import { MarketplaceStars } from "./stars";
import type {
  ClassLevel,
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
const HERO_COLLAGE_BG_MOBILE = "/marketplace/hero-collage-bg-mobile.jpg";
const HERO_COLLAGE_BG_MOBILE_DARK =
  "/marketplace/hero-collage-bg-mobile-dark.jpg";

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

function levelLabel(level: ClassLevel | null): string {
  if (level === "BEGINNER") return "Beginner";
  if (level === "INTERMEDIATE") return "Intermediate";
  if (level === "ADVANCED") return "Advanced";
  return "All levels";
}

function formatTryPrice(
  price: number | null,
  cadence: "MONTHLY" | "QUARTERLY" | null,
): string | null {
  if (price == null) return null;
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  if (cadence === "QUARTERLY") return `From ${formatted} / quarter`;
  return `From ${formatted} / month`;
}

function TryNewClassCard({
  item,
  onBook,
}: {
  item: MarketplaceClassCard;
  onBook: (item: MarketplaceClassCard) => void;
}) {
  const price = formatTryPrice(item.priceFrom, item.priceCadence);
  return (
    <article className={styles.tryCard}>
      <div className={styles.tryMedia}>
        <Link
          to="/classes/$slug"
          params={{ slug: item.slug }}
          className={styles.tryMediaLink}
          tabIndex={-1}
          aria-hidden
        >
          {item.coverImageUrl ? (
            <img className={styles.tryImage} src={item.coverImageUrl} alt="" />
          ) : (
            <div className={styles.tryPlaceholder} aria-hidden>
              {item.name.slice(0, 1)}
            </div>
          )}
        </Link>
        <span className={styles.tryCat} data-cat={item.category}>
          {categoryLabel(item.category)}
        </span>
      </div>
      <div className={styles.tryBody}>
        <Link
          to="/classes/$slug"
          params={{ slug: item.slug }}
          className={styles.tryCopy}
        >
          <h3 className={styles.tryName}>{item.name}</h3>
          <p className={styles.tryStudio}>{item.studioName}</p>
          <div className={styles.tryRating}>
            <MarketplaceStars rating={item.studioRating} />
          </div>
          <p className={styles.tryMeta}>
            <Signal aria-hidden className={styles.tryMetaIcon} />
            <span>{levelLabel(item.level)}</span>
          </p>
        </Link>
        <div className={styles.tryFooter}>
          {price ? <span className={styles.tryPrice}>{price}</span> : <span />}
          <button
            type="button"
            className={styles.tryBook}
            disabled={!item.canTrial && !item.canEnroll}
            onClick={() => onBook(item)}
          >
            Book →
          </button>
        </div>
      </div>
    </article>
  );
}

function LandingInner() {
  const navigate = useNavigate();
  const { cityId, cityLabel } = useDiscoverCity();
  const { viewerKey, resolveAuth } = useMarketplaceAuth();
  const [q, setQ] = useState("");
  const [book, setBook] = useState<BookSheetTarget | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Find your next class in ${cityLabel} | classa`;
  }, [cityLabel]);

  const trySearch = {
    city: cityId,
    sort: "rating" as const,
    limit: 8,
  };

  const tryQuery = useQuery({
    queryKey: marketplaceClassesQueryKey(trySearch, viewerKey),
    queryFn: async () =>
      fetchMarketplaceClasses(trySearch, await resolveAuth()),
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

  const tryClasses = (tryQuery.data?.items ?? []).slice(0, 8);
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
          src={HERO_COLLAGE_BG_MOBILE}
          alt=""
          aria-hidden
          data-theme="light"
          data-viewport="mobile"
        />
        <img
          className={styles.heroBg}
          src={HERO_COLLAGE_BG_MOBILE_DARK}
          alt=""
          aria-hidden
          data-theme="dark"
          data-viewport="mobile"
        />
        <img
          className={styles.heroBg}
          src={HERO_COLLAGE_BG}
          alt=""
          aria-hidden
          data-theme="light"
          data-viewport="desktop"
        />
        <img
          className={styles.heroBg}
          src={HERO_COLLAGE_BG_DARK}
          alt=""
          aria-hidden
          data-theme="dark"
          data-viewport="desktop"
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
          <div className={styles.tryPanel}>
            <Reveal>
              <div className={styles.tryHead}>
                <div className={styles.tryCopyBlock}>
                  <h2 id="try-title" className={styles.tryTitle}>
                    Try something new
                  </h2>
                  <p className={styles.trySupport}>
                    Fresh studios. New experiences.
                  </p>
                </div>
                <Link
                  to="/classes"
                  search={{ city: cityId, sort: "rating" }}
                  className={styles.tryExplore}
                >
                  Explore all →
                </Link>
              </div>
            </Reveal>
            {tryQuery.isLoading ? (
              <p className={styles.hint}>Loading classes to try</p>
            ) : null}
            {tryQuery.isError ? (
              <p className={styles.hint}>
                Could not load classes. Start the API and refresh.
              </p>
            ) : null}
            {!tryQuery.isLoading &&
            !tryQuery.isError &&
            tryClasses.length === 0 ? (
              <p className={styles.hint}>
                New classes in {cityLabel} are coming soon.
              </p>
            ) : null}
            {tryClasses.length > 0 ? (
              <div className={styles.tryRail}>
                {tryClasses.map((item, index) => (
                  <Reveal key={item.id} delay={index * 40}>
                    <div className={styles.tryRailItem}>
                      <TryNewClassCard item={item} onBook={bookClass} />
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : null}
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

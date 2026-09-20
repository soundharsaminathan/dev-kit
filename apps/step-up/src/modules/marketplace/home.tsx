import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/modules/layout/public-shell";
import {
  DiscoverCityProvider,
  useDiscoverCity,
} from "@/modules/student-landing/city-context";
import { BookSheet } from "./book-sheet";
import type { BookSheetTarget } from "./book";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { RateLastClass } from "./rate-last-class";
import { useMarketplaceAuth } from "./use-marketplace-auth";
import { MARKETPLACE_AREAS } from "./areas";
import {
  fetchMarketplaceClasses,
  fetchMarketplaceStudios,
  fetchMarketplaceTrainer,
  fetchMarketplaceTrainers,
  marketplaceClassesQueryKey,
  marketplaceStudiosQueryKey,
  marketplaceTrainersQueryKey,
} from "./catalog";
import {
  MarketplaceCardSkeletonGrid,
  MarketplaceClassCardView,
  MarketplaceStudioCardView,
  MarketplaceTrainerCardView,
} from "./cards";
import {
  categoryLabel,
  clearMarketplaceFilters,
  hasNarrowFilters,
  marketplaceCatalogQuery,
  marketplacePathForTab,
  marketplaceTitle,
  matchesWhenFilter,
  toggleAudience,
  toggleLevel,
  writeStoredCategory,
  type MarketplaceUrlSearch,
} from "./search";
import type {
  MarketplaceCatalogTab,
  MarketplaceClassCard,
  MarketplaceStudioCard,
  MarketplaceTrainerCard,
  PublicMarketplaceCategory,
} from "./types";
import { PUBLIC_MARKETPLACE_CATEGORIES } from "./types";
import cardStyles from "./cards.module.scss";
import styles from "./home.module.scss";

const CATEGORY_CHIPS = PUBLIC_MARKETPLACE_CATEGORIES.map((id) => ({
  id,
  label: categoryLabel(id),
}));

const TAB_CHIPS: Array<{ id: MarketplaceCatalogTab; label: string }> = [
  { id: "classes", label: "Classes" },
  { id: "studios", label: "Studios" },
  { id: "trainers", label: "Trainers" },
];

type BookTarget = BookSheetTarget;

export function MarketplaceHome({
  tab,
  search,
  variant = "public",
}: {
  tab: MarketplaceCatalogTab;
  search: MarketplaceUrlSearch;
  variant?: "public" | "member";
}) {
  const navigate = useNavigate();
  const { user, viewerKey, resolveAuth } = useMarketplaceAuth();
  const { cityId, cityLabel, selectCity } = useDiscoverCity();
  const [draftQ, setDraftQ] = useState(search.q ?? "");
  const [areaOpen, setAreaOpen] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [book, setBook] = useState<BookTarget | null>(null);

  const city = search.city ?? cityId;
  const category = search.category ?? "DANCE";

  useEffect(() => {
    writeStoredCategory(category);
  }, [category]);

  useEffect(() => {
    if (search.city && search.city !== cityId) {
      selectCity(search.city);
      return;
    }
    if (!search.city || search.city === cityId) return;
  }, [cityId, search.city, selectCity]);

  useEffect(() => {
    if (cityId !== city) {
      void navigate({
        to: ".",
        search: { ...search, city: cityId, category },
        replace: true,
      });
    }
  }, [category, city, cityId, navigate, search]);

  useEffect(() => {
    setDraftQ(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const title = `${marketplaceTitle(category, cityLabel, tab)} | classa`;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [category, cityLabel, tab]);

  function patchSearch(next: Partial<MarketplaceUrlSearch>) {
    void navigate({
      to: ".",
      search: {
        ...search,
        city,
        category,
        ...next,
      },
      replace: true,
    });
  }

  function goTab(nextTab: MarketplaceCatalogTab) {
    void navigate({
      to: marketplacePathForTab(nextTab, variant),
      search: {
        ...search,
        city,
        category,
        tab: variant === "member" ? nextTab : undefined,
      },
    });
  }

  function submitSearch() {
    const q = draftQ.trim();
    patchSearch({
      q: q || undefined,
      sort: q ? search.sort ?? "relevance" : search.sort,
    });
  }

  function requestNearMe() {
    if (!navigator.geolocation) {
      setGeoHint("Turn on location to sort by nearest");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoHint(null);
        patchSearch({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          sort: "nearest",
        });
      },
      () => setGeoHint("Turn on location to sort by nearest"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  const catalogInput = marketplaceCatalogQuery({ ...search, city, category });
  const classesQuery = useQuery({
    queryKey: marketplaceClassesQueryKey(catalogInput, viewerKey),
    queryFn: async () =>
      fetchMarketplaceClasses(catalogInput, await resolveAuth()),
    enabled: tab === "classes",
    staleTime: 30_000,
  });
  const studiosQuery = useQuery({
    queryKey: marketplaceStudiosQueryKey(catalogInput, viewerKey),
    queryFn: async () =>
      fetchMarketplaceStudios(catalogInput, await resolveAuth()),
    enabled: tab === "studios",
    staleTime: 30_000,
  });
  const trainersQuery = useQuery({
    queryKey: marketplaceTrainersQueryKey(catalogInput, viewerKey),
    queryFn: async () =>
      fetchMarketplaceTrainers(catalogInput, await resolveAuth()),
    enabled: tab === "trainers",
    staleTime: 30_000,
  });

  const page =
    tab === "classes"
      ? classesQuery.data
      : tab === "studios"
        ? studiosQuery.data
        : trainersQuery.data;
  const loading =
    tab === "classes"
      ? classesQuery.isLoading
      : tab === "studios"
        ? studiosQuery.isLoading
        : trainersQuery.isLoading;
  const errored =
    tab === "classes"
      ? classesQuery.isError
      : tab === "studios"
        ? studiosQuery.isError
        : trainersQuery.isError;

  const classItems = useMemo(() => {
    const items = classesQuery.data?.items ?? [];
    return items.filter((item) =>
      matchesWhenFilter(item.nextSessionAt, search.when),
    );
  }, [classesQuery.data?.items, search.when]);
  const studioItems = useMemo(() => {
    const items = studiosQuery.data?.items ?? [];
    return items.filter((item) =>
      matchesWhenFilter(item.nextTrialAt, search.when),
    );
  }, [search.when, studiosQuery.data?.items]);
  const trainerItems = useMemo(() => {
    const items = trainersQuery.data?.items ?? [];
    return items.filter((item) =>
      matchesWhenFilter(item.nextClassAt, search.when),
    );
  }, [search.when, trainersQuery.data?.items]);

  const visibleCount =
    tab === "classes"
      ? classItems.length
      : tab === "studios"
        ? studioItems.length
        : trainerItems.length;
  const emptyFromWhen = Boolean(search.when) && visibleCount === 0 && page;
  const empty = emptyFromWhen
    ? {
        kind: "filters" as const,
        message: `No ${tab} match these filters.`,
      }
    : (page?.empty ?? { kind: null, message: null });

  const sortChips = [
    ...(search.q ? [{ id: "relevance", label: "Relevance" }] : []),
    { id: "earliest", label: "Earliest" },
    { id: "price", label: "Price" },
    { id: "rating", label: "Rating" },
    { id: "nearest", label: "Nearest" },
  ];

  const filterChips = [
    { id: "ALL", label: "All" },
    { id: "KIDS", label: "Kids" },
    { id: "ADULTS", label: "Adults" },
    { id: "BEGINNER", label: "Beginner" },
    { id: "INTERMEDIATE", label: "Intermediate" },
    { id: "ADVANCED", label: "Advanced" },
  ];
  const selectedFilters = [
    search.audience ?? "ALL",
    search.level,
  ].filter((value): value is string => Boolean(value));

  const railChips = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "weekend", label: "Weekend" },
    { id: "evening", label: "Evening" },
    { id: "area", label: "Area" },
    { id: "near", label: "Near me" },
  ];
  const selectedRail = [
    search.when,
    search.days,
    search.time,
    search.locality ? "area" : undefined,
    search.sort === "nearest" ? "near" : undefined,
  ].filter((value): value is string => Boolean(value));

  async function bookTrainer(item: MarketplaceTrainerCard) {
    const detail = await fetchMarketplaceTrainer(item.slug ?? item.id);
    const firstClass = detail.classes[0];
    const classStudio = firstClass
      ? detail.studios.find((studio) => studio.slug === firstClass.studioSlug)
      : undefined;
    const firstStudio =
      classStudio ??
      detail.studios.find((studio) => studio.canPrivate) ??
      detail.studios[0];
    if (firstClass && firstStudio) {
      setBook({
        source: "trainer",
        studioId: firstStudio.id,
        studioName: firstStudio.name,
        batchId: firstClass.id,
        classSlug: firstClass.slug,
        className: firstClass.name,
        trainerId: item.id,
        trainerName: item.name,
        canTrial: item.canTrial,
        canPrivate: item.canPrivate,
        canFloorHire: false,
      });
      return;
    }
    if (firstStudio) {
      setBook({
        source: "trainer",
        studioId: firstStudio.id,
        studioName: firstStudio.name,
        trainerId: item.id,
        trainerName: item.name,
        canTrial: item.canTrial,
        canPrivate: item.canPrivate,
        canFloorHire: false,
      });
    }
  }

  function bookClass(item: MarketplaceClassCard) {
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
  }

  function bookStudio(item: MarketplaceStudioCard) {
    setBook({
      source: "studio",
      studioId: item.id,
      studioName: item.name,
      canTrial: item.canTrial,
      canEnroll: false,
      canPrivate: item.canPrivate,
      canFloorHire: false,
    });
  }

  const feed = (
    <div className={styles.page} data-variant={variant}>
        <div className={styles.chrome} data-variant={variant}>
          <div className={styles.chromeInner}>
            <div className={styles.tabs} role="tablist" aria-label="Category">
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={styles.category}
                  data-active={chip.id === category || undefined}
                  onClick={() =>
                    patchSearch({
                      category: chip.id as PublicMarketplaceCategory,
                    })
                  }
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className={styles.tabs} role="tablist" aria-label="Browse">
              {TAB_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={styles.tab}
                  data-active={chip.id === tab || undefined}
                  onClick={() => goTab(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <form
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <input
                id="marketplace-search"
                className={styles.searchInput}
                type="search"
                value={draftQ}
                placeholder="Search class, studio, or trainer"
                aria-label="Search class, studio, or trainer"
                onChange={(event) => setDraftQ(event.target.value)}
              />
            </form>
            <FilterChipRow
              chips={filterChips}
              selected={selectedFilters}
              onToggle={(id) => {
                if (id === "ALL") {
                  patchSearch({ audience: undefined });
                  return;
                }
                if (id === "KIDS" || id === "ADULTS") {
                  patchSearch({ audience: toggleAudience(search.audience, id) });
                  return;
                }
                if (
                  id === "BEGINNER" ||
                  id === "INTERMEDIATE" ||
                  id === "ADVANCED"
                ) {
                  patchSearch({ level: toggleLevel(search.level, id) });
                }
              }}
            />
            <FilterChipRow
              chips={railChips}
              selected={selectedRail}
              onToggle={(id) => {
                if (id === "today" || id === "tomorrow") {
                  patchSearch({
                    when: search.when === id ? undefined : id,
                    sort: "earliest",
                  });
                  return;
                }
                if (id === "weekend") {
                  patchSearch({
                    days: search.days === "weekend" ? undefined : "weekend",
                  });
                  return;
                }
                if (id === "evening") {
                  patchSearch({
                    time: search.time === "evening" ? undefined : "evening",
                  });
                  return;
                }
                if (id === "area") {
                  setAreaOpen(true);
                  return;
                }
                if (id === "near") requestNearMe();
              }}
            />
            <FilterChipRow
              chips={sortChips}
              selected={[search.sort ?? catalogInput.sort ?? "availability"]}
              onToggle={(id) => {
                if (id === "nearest" && (search.lat == null || search.lng == null)) {
                  requestNearMe();
                  return;
                }
                patchSearch({
                  sort: id as MarketplaceUrlSearch["sort"],
                });
              }}
            />
          </div>
        </div>

        <section className={styles.feed}>
          <div className={styles.heading}>
            {variant === "member" ? (
              <p className={styles.title}>
                {marketplaceTitle(category, cityLabel, tab)}
              </p>
            ) : (
              <h1 className={styles.title}>
                {marketplaceTitle(category, cityLabel, tab)}
              </h1>
            )}
            {geoHint ? <p className={styles.hint}>{geoHint}</p> : null}
            <RateLastClass enabled={Boolean(user?.id)} />
          </div>

          {loading ? <MarketplaceCardSkeletonGrid /> : null}

          {!loading && !errored && visibleCount === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.empty}>
                {empty.message ??
                  `${categoryLabel(category)} ${tab} in ${cityLabel} are coming soon.`}
              </p>
              <div className={styles.emptyActions}>
                {hasNarrowFilters(search) || empty.kind === "filters" ? (
                  <button
                    type="button"
                    className={styles.emptyBtn}
                    onClick={() => patchSearch(clearMarketplaceFilters(search))}
                  >
                    Clear filters
                  </button>
                ) : null}
                {empty.kind === "tab" ? (
                  <>
                    <Link
                      to={marketplacePathForTab("classes", variant)}
                      search={{
                        ...search,
                        city,
                        category,
                        tab: variant === "member" ? "classes" : undefined,
                      }}
                      className={styles.emptyLink}
                    >
                      Browse classes
                    </Link>
                    <Link
                      to={marketplacePathForTab("studios", variant)}
                      search={{
                        ...search,
                        city,
                        category,
                        tab: variant === "member" ? "studios" : undefined,
                      }}
                      className={styles.emptyLink}
                    >
                      Browse studios
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {errored ? (
            <p className={styles.empty}>Could not load this catalog. Try again.</p>
          ) : null}

          {!loading && visibleCount > 0 ? (
            <div className={cardStyles.grid}>
              {tab === "classes"
                ? classItems.map((item) => (
                    <MarketplaceClassCardView
                      key={item.id}
                      item={item}
                      onBook={bookClass}
                    />
                  ))
                : null}
              {tab === "studios"
                ? studioItems.map((item) => (
                    <MarketplaceStudioCardView
                      key={item.id}
                      item={item}
                      onBook={bookStudio}
                    />
                  ))
                : null}
              {tab === "trainers"
                ? trainerItems.map((item) => (
                    <MarketplaceTrainerCardView
                      key={item.id}
                      item={item}
                      onBook={(next) => void bookTrainer(next)}
                    />
                  ))
                : null}
            </div>
          ) : null}
        </section>

      <AppSheet
        isOpen={areaOpen}
        onOpenChange={setAreaOpen}
        title="Area"
      >
        <div className={styles.areaSheet}>
          <button
            type="button"
            className={styles.areaBtn}
            data-active={!search.locality || undefined}
            onClick={() => {
              patchSearch({ locality: undefined });
              setAreaOpen(false);
            }}
          >
            All areas
          </button>
          {MARKETPLACE_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              className={styles.areaBtn}
              data-active={search.locality === area.id || undefined}
              onClick={() => {
                patchSearch({ locality: area.id });
                setAreaOpen(false);
              }}
            >
              {area.label}
            </button>
          ))}
        </div>
      </AppSheet>

      <BookSheet
        open={Boolean(book)}
        onOpenChange={(open) => {
          if (!open) setBook(null);
        }}
        target={book}
      />
    </div>
  );

  if (variant === "member") {
    return (
      <DiscoverCityProvider>
        <Screen title="Discover" wide>
          <PullToRefresh
            onRefresh={async () => {
              await Promise.all([
                classesQuery.refetch(),
                studiosQuery.refetch(),
                trainersQuery.refetch(),
              ]);
            }}
          >
            {feed}
          </PullToRefresh>
        </Screen>
      </DiscoverCityProvider>
    );
  }

  return (
    <PublicShell nav="student" width="full">
      {feed}
    </PublicShell>
  );
}

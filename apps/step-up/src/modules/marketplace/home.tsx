import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/modules/layout/public-shell";
import {
  DiscoverCityProvider,
  useDiscoverCity,
} from "@/modules/student-landing/city-context";
import { isLiveCity } from "@/modules/student-landing/types";
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
import { MarketplaceMap } from "./map";
import {
  marketplacePlaceTitle,
  marketplacePinsForItems,
  type MarketplacePlace,
} from "./place";
import {
  categoryLabel,
  clearMarketplaceFilters,
  hasNarrowFilters,
  marketplaceCanonicalPath,
  marketplaceCatalogQuery,
  marketplaceNavigateArgs,
  marketplacePageShouldIndex,
  marketplacePlaceFromSearch,
  matchesWhenFilter,
  toggleAudience,
  toggleLevel,
  writeStoredCategory,
  type MarketplaceUrlSearch,
} from "./search";
import { useMarketplaceSeo } from "./seo";
import type {
  MarketplaceCatalogTab,
  MarketplaceClassCard,
  MarketplaceMapPin,
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
  place,
}: {
  tab: MarketplaceCatalogTab;
  search: MarketplaceUrlSearch;
  variant?: "public" | "member";
  place?: MarketplacePlace | null;
}) {
  const navigate = useNavigate();
  const { user, viewerKey, resolveAuth } = useMarketplaceAuth();
  const { cityId, cityLabel, selectCity } = useDiscoverCity();
  const [draftQ, setDraftQ] = useState(search.q ?? "");
  const [areaOpen, setAreaOpen] = useState(false);
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [book, setBook] = useState<BookTarget | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const city = search.city ?? cityId;
  const category = search.category ?? "DANCE";
  const view = search.view === "map" ? "map" : "list";
  const activePlace = place ?? marketplacePlaceFromSearch(search);
  const title = marketplacePlaceTitle({
    categoryLabel: categoryLabel(category),
    cityLabel,
    tab,
    place: activePlace,
  });

  useEffect(() => {
    writeStoredCategory(category);
  }, [category]);

  useEffect(() => {
    if (isLiveCity(city)) selectCity(city);
  }, [city, selectCity]);

  useEffect(() => {
    if (cityId === city || !isLiveCity(cityId)) return;
    go({ city: cityId }, tab, true);
    // city switcher is the only writer of a live cityId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  useEffect(() => {
    setDraftQ(search.q ?? "");
  }, [search.q]);

  function go(
    next: Partial<MarketplaceUrlSearch>,
    nextTab = tab,
    replace = true,
  ) {
    const merged: MarketplaceUrlSearch = {
      ...search,
      city,
      category,
      ...next,
    };
    const target = marketplaceNavigateArgs(nextTab, merged, variant);
    void navigate({
      to: target.to,
      ...(target.params ? { params: target.params } : {}),
      search: target.search,
      replace,
    });
  }

  function patchSearch(next: Partial<MarketplaceUrlSearch>) {
    go(next, tab, true);
  }

  function goTab(nextTab: MarketplaceCatalogTab) {
    go({}, nextTab, false);
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

  const featuredStudiosQuery = useQuery({
    queryKey: marketplaceStudiosQueryKey(
      { ...catalogInput, sort: "rating", limit: 6 },
      `featured:${viewerKey}`,
    ),
    queryFn: async () =>
      fetchMarketplaceStudios(
        { ...catalogInput, sort: "rating", limit: 6 },
        await resolveAuth(),
      ),
    enabled: variant === "public" && tab === "classes",
    staleTime: 60_000,
  });
  const featuredStudios = (featuredStudiosQuery.data?.items ?? []).slice(0, 4);

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

  const visibleItems =
    tab === "classes"
      ? classItems
      : tab === "studios"
        ? studioItems
        : trainerItems;
  const visibleCount = visibleItems.length;
  const pins = useMemo(
    () => marketplacePinsForItems(page?.pins, visibleItems.map((item) => item.id)),
    [page?.pins, visibleItems],
  );
  const emptyFromWhen = Boolean(search.when) && visibleCount === 0 && page;
  const empty = emptyFromWhen
    ? {
        kind: "filters" as const,
        message: `No ${tab} match these filters.`,
      }
    : (page?.empty ?? { kind: null, message: null });

  useMarketplaceSeo({
    title,
    path: marketplaceCanonicalPath({ ...search, city, category }, tab),
    count: visibleCount,
    index: marketplacePageShouldIndex(
      { ...search, city, category },
      !loading && visibleCount > 0,
      Boolean(place),
    ),
    enabled: variant === "public",
  });

  const sortChips = [
    { id: "availability", label: "Availability" },
    ...(search.q ? [{ id: "relevance", label: "Relevance" }] : []),
    { id: "earliest", label: "Earliest" },
    { id: "price", label: "Price" },
    { id: "rating", label: "Rating" },
    { id: "nearest", label: "Nearest" },
    { id: "popularity", label: "Popular" },
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

  function selectPin(pin: MarketplaceMapPin) {
    setSelectedId(pin.id);
    const itemId = pin.itemIds[0];
    if (!itemId) return;
    document
      .getElementById(`marketplace-card-${itemId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function selectItem(itemId: string) {
    const pin = pins.find((entry) => entry.itemIds.includes(itemId));
    if (pin) setSelectedId(pin.id);
  }

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

  const classesLink = marketplaceNavigateArgs(
    "classes",
    { ...search, city, category },
    variant,
  );
  const studiosLink = marketplaceNavigateArgs(
    "studios",
    { ...search, city, category },
    variant,
  );

  const viewToggle = (
    <div className={styles.viewToggle} role="group" aria-label="View">
      <button
        type="button"
        className={styles.viewBtn}
        data-active={view === "list" || undefined}
        onClick={() => patchSearch({ view: "list" })}
      >
        List
      </button>
      <button
        type="button"
        className={styles.viewBtn}
        data-active={view === "map" || undefined}
        onClick={() => patchSearch({ view: "map" })}
      >
        Map
      </button>
    </div>
  );

  const filterSidebar = (
    <aside className={styles.sidebar} aria-label="Filters">
      <div className={styles.filterGroup}>
        <h2 className={styles.filterTitle}>Category</h2>
        <div className={styles.filterList}>
          {CATEGORY_CHIPS.map((chip) => (
            <label key={chip.id} className={styles.filterOption}>
              <input
                type="radio"
                name="marketplace-category"
                checked={chip.id === category}
                onChange={() =>
                  patchSearch({
                    category: chip.id as PublicMarketplaceCategory,
                  })
                }
              />
              <span>{chip.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <h2 className={styles.filterTitle}>Audience</h2>
        <div className={styles.filterList}>
          {[
            { id: "ALL", label: "All" },
            { id: "KIDS", label: "Kids" },
            { id: "ADULTS", label: "Adults" },
          ].map((chip) => (
            <label key={chip.id} className={styles.filterOption}>
              <input
                type="radio"
                name="marketplace-audience"
                checked={(search.audience ?? "ALL") === chip.id}
                onChange={() => {
                  if (chip.id === "ALL") {
                    patchSearch({ audience: undefined });
                    return;
                  }
                  patchSearch({
                    audience: chip.id as "KIDS" | "ADULTS",
                  });
                }}
              />
              <span>{chip.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <h2 className={styles.filterTitle}>Level</h2>
        <div className={styles.filterList}>
          {[
            { id: "BEGINNER", label: "Beginner" },
            { id: "INTERMEDIATE", label: "Intermediate" },
            { id: "ADVANCED", label: "Advanced" },
          ].map((chip) => (
            <label key={chip.id} className={styles.filterOption}>
              <input
                type="checkbox"
                checked={search.level === chip.id}
                onChange={() =>
                  patchSearch({
                    level: toggleLevel(
                      search.level,
                      chip.id as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                    ),
                  })
                }
              />
              <span>{chip.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <h2 className={styles.filterTitle}>Date and time</h2>
        <div className={styles.filterList}>
          {[
            { id: "today", label: "Today", key: "when" as const },
            { id: "tomorrow", label: "Tomorrow", key: "when" as const },
            { id: "weekend", label: "Weekend", key: "days" as const },
            { id: "evening", label: "Evening", key: "time" as const },
          ].map((chip) => {
            const active =
              chip.key === "when"
                ? search.when === chip.id
                : chip.key === "days"
                  ? search.days === chip.id
                  : search.time === chip.id;
            return (
              <label key={chip.id} className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={Boolean(active)}
                  onChange={() => {
                    if (chip.key === "when") {
                      patchSearch({
                        when:
                          search.when === chip.id
                            ? undefined
                            : (chip.id as "today" | "tomorrow"),
                        sort: "earliest",
                      });
                      return;
                    }
                    if (chip.key === "days") {
                      patchSearch({
                        days:
                          search.days === "weekend" ? undefined : "weekend",
                      });
                      return;
                    }
                    patchSearch({
                      time: search.time === "evening" ? undefined : "evening",
                    });
                  }}
                />
                <span>{chip.label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <h2 className={styles.filterTitle}>Area</h2>
        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setAreaOpen(true)}
        >
          {search.locality
            ? (MARKETPLACE_AREAS.find((a) => a.id === search.locality)?.label ??
              "Area")
            : "All areas"}
        </button>
        <button
          type="button"
          className={styles.filterBtn}
          onClick={requestNearMe}
        >
          Near me
        </button>
      </div>
      {hasNarrowFilters(search) || search.locality ? (
        <button
          type="button"
          className={styles.clearFilters}
          onClick={() => patchSearch(clearMarketplaceFilters(search))}
        >
          Clear filters
        </button>
      ) : null}
    </aside>
  );

  const feed = (
    <div className={styles.page} data-variant={variant} data-view={view}>
        <div className={styles.chrome} data-variant={variant}>
          <div className={styles.chromeInner}>
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
            <div className={styles.mobileFilters}>
              <FilterChipRow
                chips={CATEGORY_CHIPS}
                selected={[category]}
                onToggle={(id) =>
                  patchSearch({
                    category: id as PublicMarketplaceCategory,
                  })
                }
              />
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
              <div className={styles.rail}>
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
              </div>
            </div>
          </div>
        </div>

        <div className={styles.browse} data-view={view}>
          {filterSidebar}
          <section className={styles.feed} data-view={view}>
          <div className={styles.heading}>
            <div className={styles.headingRow}>
              {variant === "member" ? (
                <p className={styles.title}>{title}</p>
              ) : (
                <h1 className={styles.title}>{title}</h1>
              )}
              <div className={styles.headingTools}>
                {visibleCount > 0 ? (
                  <p className={styles.count}>{visibleCount} results</p>
                ) : null}
                <label className={styles.sortLabel}>
                  <span className={styles.sortText}>Sort by</span>
                  <select
                    className={styles.sortSelect}
                    value={search.sort ?? catalogInput.sort ?? "availability"}
                    onChange={(event) => {
                      const next = event.target.value as MarketplaceUrlSearch["sort"];
                      if (next === "nearest" && (search.lat == null || search.lng == null)) {
                        requestNearMe();
                        return;
                      }
                      patchSearch({ sort: next });
                    }}
                  >
                    {sortChips.map((chip) => (
                      <option key={chip.id} value={chip.id}>
                        {chip.label}
                      </option>
                    ))}
                  </select>
                </label>
                {viewToggle}
              </div>
            </div>
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
                    <Link {...classesLink} className={styles.emptyLink}>
                      Browse classes
                    </Link>
                    <Link {...studiosLink} className={styles.emptyLink}>
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
            <div className={styles.board} data-view={view}>
              {view === "map" ? (
                <div className={styles.mapPane}>
                  <MarketplaceMap
                    pins={pins}
                    selectedId={selectedId}
                    onSelect={selectPin}
                  />
                </div>
              ) : null}
              <div
                className={cardStyles.grid}
                data-view={view}
                data-layout={view === "list" ? "list" : undefined}
              >
                {tab === "classes"
                  ? classItems.map((item) => (
                      <div
                        key={item.id}
                        id={`marketplace-card-${item.id}`}
                        className={styles.cardWrap}
                        data-selected={
                          pins.some(
                            (pin) =>
                              pin.id === selectedId &&
                              pin.itemIds.includes(item.id),
                          ) || undefined
                        }
                        onClick={() => selectItem(item.id)}
                      >
                        <MarketplaceClassCardView
                          item={item}
                          onBook={bookClass}
                        />
                      </div>
                    ))
                  : null}
                {tab === "studios"
                  ? studioItems.map((item) => (
                      <div
                        key={item.id}
                        id={`marketplace-card-${item.id}`}
                        className={styles.cardWrap}
                        data-selected={
                          pins.some(
                            (pin) =>
                              pin.id === selectedId &&
                              pin.itemIds.includes(item.id),
                          ) || undefined
                        }
                        onClick={() => selectItem(item.id)}
                      >
                        <MarketplaceStudioCardView
                          item={item}
                          onBook={bookStudio}
                        />
                      </div>
                    ))
                  : null}
                {tab === "trainers"
                  ? trainerItems.map((item) => (
                      <div
                        key={item.id}
                        id={`marketplace-card-${item.id}`}
                        className={styles.cardWrap}
                        data-selected={
                          pins.some(
                            (pin) =>
                              pin.id === selectedId &&
                              pin.itemIds.includes(item.id),
                          ) || undefined
                        }
                        onClick={() => selectItem(item.id)}
                      >
                        <MarketplaceTrainerCardView
                          item={item}
                          onBook={(next) => void bookTrainer(next)}
                        />
                      </div>
                    ))
                  : null}
              </div>
            </div>
          ) : null}

          {featuredStudios.length > 0 ? (
            <section className={styles.featured} aria-labelledby="featured-studios">
              <div className={styles.featuredHead}>
                <h2 id="featured-studios" className={styles.featuredTitle}>
                  Featured studios
                </h2>
                <Link
                  {...studiosLink}
                  className={styles.featuredLink}
                >
                  See all studios
                </Link>
              </div>
              <div className={styles.featuredRail}>
                {featuredStudios.map((item) => (
                  <div key={item.id} className={styles.featuredCard}>
                    <MarketplaceStudioCardView
                      item={item}
                      onBook={bookStudio}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </section>
        </div>

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
                patchSearch({
                  locality: area.id,
                  style: undefined,
                });
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

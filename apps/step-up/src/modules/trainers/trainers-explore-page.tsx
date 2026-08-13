import { SearchField } from "@dev-ui/components/search-field";
import { useIsMobile } from "@dev-ui/hooks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/constants";
import {
  collectTrainerStyleFilters,
  trainerHasStyle,
} from "@/lib/dance-styles";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { matchesPersonSearch } from "@/lib/person-search";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";
import { HomeStudioBanner } from "@/modules/me/home-sections";
import type { HomePayload } from "@/modules/me/home-types";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { useFollowMutations } from "@/modules/social/use-follow";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { TrainerBentoView } from "./trainer-bento-view";
import { TrainerCardsView } from "./trainer-cards-view";
import { TrainerDiscoverySkeleton } from "./trainer-discovery-skeleton";
import { TrainerDiscoveryView } from "./trainer-discovery-view";
import { TrainerStackView } from "./trainer-stack-view";
import styles from "./trainers-page.module.scss";
import type { StudioTrainer, TrainerViewMode } from "./types";
import { useStudioTrainers } from "./use-trainers";

const VIEW_STORAGE_KEYS = {
  app: "step-up-app-trainers-view",
  me: "step-up-me-trainers-view",
} as const;

const VIEW_CHIPS = [
  { id: "stack", label: "Swipe" },
  { id: "bento", label: "Grid" },
  { id: "cards", label: "List" },
] as const;

function availableViews(isMobile: boolean): TrainerViewMode[] {
  return isMobile ? ["stack", "cards"] : ["bento", "cards"];
}

function coerceView(view: TrainerViewMode, isMobile: boolean): TrainerViewMode {
  const allowed = availableViews(isMobile);
  if (allowed.includes(view)) return view;
  return allowed[0] ?? "cards";
}

type TrainersExploreVariant = "app" | "me";

type TrainersExplorePageProps = {
  variant?: TrainersExploreVariant;
};

function readStoredView(
  storageKey: string,
  fallback: TrainerViewMode,
): TrainerViewMode {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "bento" || stored === "stack" || stored === "cards") {
    return stored;
  }
  return fallback;
}

function sortForExplore(trainers: StudioTrainer[]) {
  return [...trainers].sort((a, b) => {
    if (a.isFollowing !== b.isFollowing) {
      return a.isFollowing ? -1 : 1;
    }
    const aPending = a.followRequestStatus === "PENDING";
    const bPending = b.followRequestStatus === "PENDING";
    if (aPending !== bPending) {
      return aPending ? -1 : 1;
    }
    return b.followerCount - a.followerCount;
  });
}

function MemberTrainersBanner({
  showDiscoverCta,
}: {
  showDiscoverCta: boolean;
}) {
  const api = useApi();
  const { studentId } = useActiveStudentContext();
  const homeQuery = useQuery({
    queryKey: ["home", studentId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      const search = params.toString();
      return api.get<HomePayload>(`/home${search ? `?${search}` : ""}`);
    },
    enabled: Boolean(studentId),
    staleTime: 30_000,
  });

  return (
    <HomeStudioBanner
      banner={homeQuery.data?.banner ?? null}
      studioName={homeQuery.data?.studio?.name ?? null}
      title="Meet your instructors"
      cta={
        showDiscoverCta
          ? {
              label: "Discover classes",
              to: "/me/book",
              icon: "search",
            }
          : null
      }
    />
  );
}

function MemberTrainerDiscovery({
  trainers,
  isFollowPending,
  onToggleFollow,
  onOpenListView,
}: {
  trainers: StudioTrainer[];
  isFollowPending: (trainerId: string) => boolean;
  onToggleFollow: (trainer: StudioTrainer) => void;
  onOpenListView: () => void;
}) {
  const api = useApi();
  const { studentId } = useActiveStudentContext();
  const homeQuery = useQuery({
    queryKey: ["home", studentId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      const search = params.toString();
      return api.get<HomePayload>(`/home${search ? `?${search}` : ""}`);
    },
    enabled: Boolean(studentId),
    staleTime: 30_000,
  });

  return (
    <TrainerDiscoveryView
      trainers={trainers}
      isFollowPending={isFollowPending}
      onToggleFollow={onToggleFollow}
      studioName={homeQuery.data?.studio?.name ?? null}
      branchName={homeQuery.data?.banner?.branchName ?? null}
      onOpenListView={onOpenListView}
    />
  );
}

export function TrainersExplorePage({
  variant = "app",
}: TrainersExplorePageProps) {
  const { user } = useAuth();
  const isStaff = variant === "app";
  const canManageTrainers = isStaff && isAdminRole(user?.role);
  const isMobile = useIsMobile();
  const storageKey = VIEW_STORAGE_KEYS[variant];
  const defaultView: TrainerViewMode = isMobile ? "stack" : "bento";
  const viewChips = VIEW_CHIPS.filter((chip) =>
    availableViews(isMobile).includes(chip.id),
  );

  const query = useStudioTrainers();
  const { styles: danceCatalog } = useStudioDanceStyles();
  const { toggleFollow, isPendingFor } = useFollowMutations();
  const [view, setView] = useState<TrainerViewMode>(() =>
    coerceView(readStoredView(storageKey, defaultView), isMobile),
  );
  const [styleFilter, setStyleFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const immersiveDiscovery = !isStaff && view === "stack";

  useEffect(() => {
    setView((current) => coerceView(current, isMobile));
  }, [isMobile]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, view);
  }, [storageKey, view]);

  const trainers = useMemo(
    () => sortForExplore(query.data ?? []),
    [query.data],
  );
  const styleFilters = useMemo(
    () => collectTrainerStyleFilters(trainers, danceCatalog),
    [trainers, danceCatalog],
  );
  const filteredTrainers = useMemo(() => {
    let next = trainers;
    if (styleFilter) {
      next = next.filter((trainer) =>
        trainerHasStyle(trainer.styles, styleFilter, danceCatalog),
      );
    }
    if (search.trim()) {
      next = next.filter((trainer) => matchesPersonSearch(trainer, search));
    }
    return next;
  }, [trainers, styleFilter, danceCatalog, search]);

  const followingCount = useMemo(
    () => trainers.filter((trainer) => trainer.isFollowing).length,
    [trainers],
  );

  useEffect(() => {
    if (styleFilter && !styleFilters.some((chip) => chip.id === styleFilter)) {
      setStyleFilter(null);
    }
  }, [styleFilter, styleFilters]);

  const styleChipRow = useMemo(
    () => [
      { id: "all", label: "All styles" },
      ...styleFilters.map((chip) => ({ id: chip.id, label: chip.label })),
    ],
    [styleFilters],
  );

  function handleToggleFollow(trainer: StudioTrainer) {
    toggleFollow({
      userId: trainer.id,
      isFollowing: trainer.isFollowing,
      followRequestStatus: trainer.followRequestStatus,
    });
  }

  const showStats = trainers.length > 0 && !immersiveDiscovery;
  const showMemberBanner = !isStaff && !immersiveDiscovery;

  const statChips = showStats ? (
    <div className={styles.pageMeta}>
      <span className={styles.statChip}>
        <strong>{trainers.length}</strong>
        {trainers.length === 1 ? "trainer" : "trainers"}
      </span>
      {styleFilters.length > 0 ? (
        <span className={styles.statChip}>
          <strong>{styleFilters.length}</strong>
          {styleFilters.length === 1 ? "style" : "styles"}
        </span>
      ) : null}
      {followingCount > 0 ? (
        <span className={styles.statChip}>
          <strong>{followingCount}</strong> following
        </span>
      ) : null}
    </div>
  ) : null;

  const toolbar =
    trainers.length > 0 ? (
      <div className={styles.toolbar}>
        <div className={styles.searchBar} data-testid="trainers-search">
          <SearchField
            aria-label="Search trainers"
            placeholder="Search by name, email, or phone"
            value={search}
            onChange={setSearch}
          />
        </div>
        {styleFilters.length > 0 ? (
          <FilterChipRow
            chips={styleChipRow}
            selected={[styleFilter ?? "all"]}
            onToggle={(id) => setStyleFilter(id === "all" ? null : id)}
          />
        ) : null}
        <div className={styles.toolbarRow}>
          <ul className={styles.viewToggle}>
            {viewChips.map((chip) => {
              const active = view === chip.id;
              return (
                <li key={chip.id}>
                  <button
                    type="button"
                    className={
                      active
                        ? `${styles.viewChip} ${styles.viewChipActive}`
                        : styles.viewChip
                    }
                    aria-pressed={active}
                    onClick={() => setView(chip.id)}
                  >
                    {chip.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    ) : null;

  if (immersiveDiscovery) {
    return (
      <section
        className={styles.immersiveScreen}
        aria-label="Instructor discovery"
      >
        {query.isLoading ? <TrainerDiscoverySkeleton /> : null}
        {query.isError ? (
          <div className={styles.immersiveState}>
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load instructors."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {query.isFetched && trainers.length === 0 ? (
          <div className={styles.immersiveState}>
            <EmptyState
              icon={ENTITY_ICONS.trainer}
              title="No instructors yet"
              description="Your studio has not published instructor profiles. Browse classes meanwhile."
              action={
                <TouchButton variant="primary">
                  <Link to="/me/book">Discover classes</Link>
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {query.isFetched &&
        trainers.length > 0 &&
        filteredTrainers.length === 0 ? (
          <div className={styles.immersiveState}>
            <EmptyState
              icon={ENTITY_ICONS.trainer}
              title={
                search.trim()
                  ? "No matching instructors"
                  : "No instructors for this style"
              }
              description={
                search.trim()
                  ? "Try a different name, email, or phone."
                  : "Try another style or clear the filter."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => {
                    setSearch("");
                    setStyleFilter(null);
                  }}
                >
                  Clear filters
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {filteredTrainers.length > 0 ? (
          <MemberTrainerDiscovery
            trainers={filteredTrainers}
            isFollowPending={isPendingFor}
            onToggleFollow={handleToggleFollow}
            onOpenListView={() => setView("cards")}
          />
        ) : null}
      </section>
    );
  }

  const pageBody = (
    <PullToRefresh onRefresh={() => query.refetch()}>
      <div
        className={styles.root}
        data-has-banner={showMemberBanner ? "true" : undefined}
      >
        {showMemberBanner ? (
          <MemberTrainersBanner showDiscoverCta={trainers.length > 0} />
        ) : null}

        {statChips}

        {toolbar}

        {query.isLoading ? <SkeletonCardList count={3} /> : null}

        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load trainers."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {query.isFetched && trainers.length === 0 ? (
          <EmptyState
            icon={ENTITY_ICONS.trainer}
            title="No trainers yet"
            description={
              canManageTrainers
                ? "Add a trainer to get started."
                : isStaff
                  ? "Your studio has not published trainer profiles yet."
                  : "Your studio has not published trainer profiles. Browse classes meanwhile."
            }
            action={
              canManageTrainers ? (
                <TouchButton variant="primary">
                  <Link to="/app/trainers/new">Add trainer</Link>
                </TouchButton>
              ) : isStaff ? undefined : (
                <TouchButton variant="primary">
                  <Link to="/me/book">Discover classes</Link>
                </TouchButton>
              )
            }
          />
        ) : null}

        {query.isFetched &&
        trainers.length > 0 &&
        filteredTrainers.length === 0 ? (
          <EmptyState
            icon={ENTITY_ICONS.trainer}
            title={
              search.trim()
                ? "No matching trainers"
                : "No trainers for this style"
            }
            description={
              search.trim()
                ? "Try a different name, email, or phone."
                : "Try another style or clear the filter."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => {
                  setSearch("");
                  setStyleFilter(null);
                }}
              >
                Clear filters
              </TouchButton>
            }
          />
        ) : null}

        {filteredTrainers.length > 0 && view === "cards" ? (
          <TrainerCardsView
            trainers={filteredTrainers}
            isFollowPending={isPendingFor}
            onToggleFollow={handleToggleFollow}
          />
        ) : null}

        {filteredTrainers.length > 0 && view === "bento" ? (
          <TrainerBentoView
            trainers={filteredTrainers}
            isFollowPending={isPendingFor}
            onToggleFollow={handleToggleFollow}
          />
        ) : null}

        {filteredTrainers.length > 0 && view === "stack" ? (
          <TrainerStackView
            trainers={filteredTrainers}
            isFollowPending={isPendingFor}
            onToggleFollow={handleToggleFollow}
          />
        ) : null}
      </div>
    </PullToRefresh>
  );

  if (immersiveDiscovery) {
    return (
      <section
        className={styles.immersiveScreen}
        aria-label="Instructor discovery"
      >
        {query.isLoading ? <TrainerDiscoverySkeleton /> : null}
        {query.isError ? (
          <div className={styles.immersiveState}>
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load instructors."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {query.isFetched && trainers.length === 0 ? (
          <div className={styles.immersiveState}>
            <EmptyState
              icon={ENTITY_ICONS.trainer}
              title="No instructors yet"
              description="Your studio has not published instructor profiles. Browse classes meanwhile."
              action={
                <TouchButton variant="primary">
                  <Link to="/me/book">Discover classes</Link>
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {query.isFetched &&
        trainers.length > 0 &&
        filteredTrainers.length === 0 ? (
          <div className={styles.immersiveState}>
            <EmptyState
              icon={ENTITY_ICONS.trainer}
              title={
                search.trim()
                  ? "No matching instructors"
                  : "No instructors for this style"
              }
              description={
                search.trim()
                  ? "Try a different name, email, or phone."
                  : "Try another style or clear the filter."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => {
                    setSearch("");
                    setStyleFilter(null);
                  }}
                >
                  Clear filters
                </TouchButton>
              }
            />
          </div>
        ) : null}
        {filteredTrainers.length > 0 ? (
          <MemberTrainerDiscovery
            trainers={filteredTrainers}
            isFollowPending={isPendingFor}
            onToggleFollow={handleToggleFollow}
            onOpenListView={() => setView("cards")}
          />
        ) : null}
      </section>
    );
  }

  if (isStaff) {
    return (
      <Screen
        title="Trainers"
        subtitle="Manage your studio's instructor team."
        wide
        actions={
          canManageTrainers ? (
            <TouchButton variant="primary" size="md">
              <Link to="/app/trainers/new">Add</Link>
            </TouchButton>
          ) : undefined
        }
      >
        {pageBody}
      </Screen>
    );
  }

  return (
    <section className="screen screen-wide" aria-label="Trainers">
      {pageBody}
    </section>
  );
}

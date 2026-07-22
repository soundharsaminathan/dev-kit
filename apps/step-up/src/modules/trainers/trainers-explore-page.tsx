import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  collectTrainerStyleFilters,
  trainerHasStyle,
} from "@/lib/dance-styles";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { HomeStudioBanner } from "@/modules/me/home-sections";
import type { HomePayload } from "@/modules/me/home-types";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { useFollowMutations } from "@/modules/social/use-follow";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { TrainerBentoView } from "./trainer-bento-view";
import { TrainerCardsView } from "./trainer-cards-view";
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

export function TrainersExplorePage({
  variant = "app",
}: TrainersExplorePageProps) {
  const isStaff = variant === "app";
  const storageKey = VIEW_STORAGE_KEYS[variant];
  const defaultView: TrainerViewMode = "stack";

  const query = useStudioTrainers();
  const { toggleFollow, isPendingFor } = useFollowMutations();
  const [view, setView] = useState<TrainerViewMode>(() =>
    readStoredView(storageKey, defaultView),
  );
  const [styleFilter, setStyleFilter] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, view);
  }, [storageKey, view]);

  const trainers = useMemo(
    () => sortForExplore(query.data ?? []),
    [query.data],
  );
  const styleFilters = useMemo(
    () => collectTrainerStyleFilters(trainers),
    [trainers],
  );
  const filteredTrainers = useMemo(() => {
    if (!styleFilter) {
      return trainers;
    }
    return trainers.filter((trainer) =>
      trainerHasStyle(trainer.styles, styleFilter),
    );
  }, [trainers, styleFilter]);

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

  const showStats = trainers.length > 0;
  const showMemberBanner = !isStaff;

  return (
    <section className="screen screen-wide" aria-label="Trainers">
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div
          className={styles.root}
          data-has-banner={showMemberBanner ? "true" : undefined}
        >
          {showMemberBanner ? (
            <MemberTrainersBanner showDiscoverCta={trainers.length > 0} />
          ) : null}

          {showStats ? (
            <div
              className={styles.intro}
              data-tone={showMemberBanner ? "quiet" : undefined}
            >
              <p className={styles.introStat}>
                <strong>{trainers.length}</strong>{" "}
                {trainers.length === 1 ? "trainer" : "trainers"}
              </p>
              {styleFilters.length > 0 ? (
                <p className={styles.introStat}>
                  <strong>{styleFilters.length}</strong>{" "}
                  {styleFilters.length === 1 ? "style" : "styles"}
                </p>
              ) : null}
              {followingCount > 0 ? (
                <p className={styles.introStat}>
                  <strong>{followingCount}</strong> following
                </p>
              ) : null}
              {isStaff ? (
                <div className={styles.introAction}>
                  <TouchButton variant="primary" size="md">
                    <Link to="/app/trainers/new">Add</Link>
                  </TouchButton>
                </div>
              ) : null}
            </div>
          ) : null}

          {trainers.length > 0 ? (
            <div className={styles.toolbar}>
              {styleFilters.length > 0 ? (
                <FilterChipRow
                  chips={styleChipRow}
                  selected={[styleFilter ?? "all"]}
                  onToggle={(id) => setStyleFilter(id === "all" ? null : id)}
                />
              ) : null}
              <div className={styles.toolbarRow}>
                <ul className={styles.viewToggle}>
                  {VIEW_CHIPS.map((chip) => {
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
                          onClick={() => setView(chip.id as TrainerViewMode)}
                        >
                          {chip.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

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
                isStaff
                  ? "Add a trainer to get started."
                  : "Your studio has not published trainer profiles. Browse classes meanwhile."
              }
              action={
                isStaff ? (
                  <TouchButton variant="primary">
                    <Link to="/app/trainers/new">Add trainer</Link>
                  </TouchButton>
                ) : (
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
              title="No trainers for this style"
              description="Try another style or clear the filter."
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => setStyleFilter(null)}
                >
                  Clear filter
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
    </section>
  );
}

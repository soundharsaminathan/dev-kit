import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { HomeNotices, useHomeNotices } from "@/modules/me/home-notices";
import {
  AchievementBadge,
  BatchProgressCard,
  CommunityCard,
  GoalRing,
  HomeStudioBanner,
  InstructorsRow,
  JourneyStats,
  RecommendedRow,
  TodayTimeline,
  TrialPromoCard,
  UpcomingClassCard,
} from "@/modules/me/home-sections";
import type { HomePayload } from "@/modules/me/home-types";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { InstallAppBar } from "@/modules/pwa/install-app-bar";
import { BloomMenu } from "@/modules/ui/bloom-menu";
import { HScrollRow } from "@/modules/ui/h-scroll-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./home.module.scss";

export const Route = createFileRoute("/me/")({
  component: MeHomePage,
});

const GOAL_BLOOM_ITEMS = [4, 8, 12, 16].map((value) => ({
  id: String(value),
  label: `${value} sessions`,
}));

function MeHomePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { studentId, loading: studentLoading } = useActiveStudentContext();
  const [installBarVisible, setInstallBarVisible] = useState(false);

  const homeQueryKey = ["home", studentId] as const;
  const goalRequestId = useRef(0);

  const homeQuery = useQuery({
    queryKey: homeQueryKey,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      const query = params.toString();
      return api.get<HomePayload>(`/home${query ? `?${query}` : ""}`, {
        signal,
      });
    },
    enabled: Boolean(studentId),
    staleTime: 30_000,
  });

  const waitingForHome =
    studentLoading || (Boolean(studentId) && homeQuery.isLoading);

  const goalMutation = useMutation({
    mutationFn: (target: number) => {
      const body: { target: number; studentId?: string } = { target };
      if (studentId) body.studentId = studentId;
      return api.put<{ id: string; target: number }>("/goals/me", body);
    },
    onMutate: async (target) => {
      const requestId = ++goalRequestId.current;
      await queryClient.cancelQueries({ queryKey: homeQueryKey });
      const previous = queryClient.getQueryData<HomePayload>(homeQueryKey);
      queryClient.setQueryData<HomePayload>(homeQueryKey, (current) =>
        current ? { ...current, goal: { ...current.goal, target } } : current,
      );
      return { previous, requestId };
    },
    onError: (_error, _target, context) => {
      if (!context || context.requestId !== goalRequestId.current) return;
      if (context.previous) {
        queryClient.setQueryData(homeQueryKey, context.previous);
      }
    },
    onSuccess: (saved, _target, context) => {
      if (!context || context.requestId !== goalRequestId.current) return;
      queryClient.setQueryData<HomePayload>(homeQueryKey, (current) =>
        current
          ? {
              ...current,
              goal: {
                ...current.goal,
                id: saved.id,
                target: saved.target,
              },
            }
          : current,
      );
    },
    onSettled: async (_data, _error, _target, context) => {
      if (!context || context.requestId !== goalRequestId.current) return;
      await queryClient.invalidateQueries({ queryKey: homeQueryKey });
    },
  });

  const data = homeQuery.data;
  const firstName = data?.student.name.split(" ")[0] || "dancer";
  const bannerCta = data?.hero.cta ?? null;
  const nextClass = data?.nextClass ?? data?.hero.nextClass ?? null;
  const showTrialPromo = data
    ? !(data.hasEnrollment ?? data.progress.length > 0)
    : false;
  const notices = useHomeNotices({ membership: data?.membership ?? null });

  function selectGoalPreset(id: string) {
    const target = Number(id);
    if (!Number.isFinite(target)) return;
    goalMutation.mutate(target);
  }

  if (waitingForHome) {
    return (
      <section className="screen" aria-busy="true" aria-label="Loading home">
        <div className={styles.root}>
          <SkeletonBlock
            height="18.5rem"
            radius="0"
            className={styles.skeletonBanner}
          />
          <HomeNotices notices={notices} flushHero />
          <SkeletonBlock height="6.5rem" radius="var(--radius-2xl, 1.25rem)" />
          <div className={styles.section}>
            <SkeletonBlock height="0.875rem" width="30%" />
            <SkeletonBlock height="5rem" radius="var(--radius-xl, 1rem)" />
          </div>
          <div className={styles.section}>
            <SkeletonBlock height="0.875rem" width="40%" />
            <SkeletonBlock height="7rem" radius="var(--radius-xl, 1rem)" />
          </div>
          <div className={styles.section}>
            <SkeletonBlock height="0.875rem" width="35%" />
            <div className={styles.skeletonRow}>
              <SkeletonBlock height="4.5rem" radius="var(--radius-xl, 1rem)" />
              <SkeletonBlock height="4.5rem" radius="var(--radius-xl, 1rem)" />
              <SkeletonBlock height="4.5rem" radius="var(--radius-xl, 1rem)" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <PullToRefresh
        onRefresh={async () => {
          await homeQuery.refetch();
        }}
      >
        <div className={styles.root}>
          <InstallAppBar onVisibleChange={setInstallBarVisible} />

          {homeQuery.isError ? (
            <ErrorState
              description={
                homeQuery.error instanceof Error
                  ? homeQuery.error.message
                  : "Could not load your home."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => homeQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {data ? (
            <>
              <HomeStudioBanner
                banner={data.banner}
                studioName={data.studio?.name ?? null}
                greeting={data.greeting}
                firstName={firstName}
                cta={bannerCta}
                flushTop={installBarVisible}
              />

              <HomeNotices notices={notices} flushHero />

              {nextClass ? (
                <UpcomingClassCard
                  nextClass={nextClass}
                  membership={data.membership}
                />
              ) : showTrialPromo ? (
                <TrialPromoCard
                  title={data.hero.title}
                  subtitle={data.hero.subtitle}
                  ctaLabel={data.hero.cta?.label ?? "Book a free trial"}
                />
              ) : null}

              {data.todayTimeline.length > 1 ? (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Today</p>
                  <TodayTimeline items={data.todayTimeline} />
                </section>
              ) : null}

              {data.progress.length > 0 ? (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Your progress</p>
                  <HScrollRow aria-label="Batch progress">
                    {data.progress.map((item) => (
                      <BatchProgressCard key={item.batchId} item={item} />
                    ))}
                  </HScrollRow>
                </section>
              ) : null}

              {data.instructors?.length ? (
                <section className={styles.section}>
                  <div className={styles.sectionHeading}>
                    <p className={styles.sectionLabel}>Top instructors</p>
                    <Link to="/me/trainers" className={styles.sectionLink}>
                      See all
                    </Link>
                  </div>
                  <InstructorsRow instructors={data.instructors} />
                </section>
              ) : null}

              {data.hasEnrollment !== false &&
              (data.hasEnrollment || data.progress.length > 0) ? (
                <>
                  <section className={styles.section}>
                    <p className={styles.sectionLabel}>Your dance journey</p>
                    <JourneyStats stats={data.stats} />
                  </section>

                  <GoalRing
                    goal={data.goal}
                    menu={
                      <BloomMenu
                        items={GOAL_BLOOM_ITEMS}
                        columns={2}
                        triggerLabel="Update"
                        triggerIcon={null}
                        panelTitle="Sessions this month"
                        onSelect={selectGoalPreset}
                      />
                    }
                  />
                </>
              ) : null}

              {data.achievements.length > 0 ? (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Achievements</p>
                  <HScrollRow aria-label="Achievements">
                    {data.achievements.map((item) => (
                      <AchievementBadge key={item.id} item={item} />
                    ))}
                  </HScrollRow>
                </section>
              ) : null}

              {data.recommendations.length > 0 ? (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>
                    {showTrialPromo ? "Try these first" : "Recommended for you"}
                  </p>
                  <RecommendedRow items={data.recommendations} />
                </section>
              ) : null}

              <section className={styles.section}>
                <p className={styles.sectionLabel}>Community</p>
                <HScrollRow aria-label="Community">
                  <CommunityCard
                    tag="Feed"
                    title="Studio feed"
                    meta={`${data.community.feedPostCount} posts`}
                    to="/me/feed"
                  />
                  {data.community.contests.map((contest) => (
                    <CommunityCard
                      key={contest.id}
                      tag="Contest"
                      title={contest.title}
                      meta={new Date(contest.startsAt).toLocaleDateString()}
                      to="/me/contests"
                    />
                  ))}
                </HScrollRow>
              </section>
            </>
          ) : (
            <HomeNotices notices={notices} />
          )}

          {!homeQuery.isLoading && !homeQuery.isError && !data && studentId ? (
            <EmptyState
              title="Nothing here yet"
              description="Pull to refresh your dance home."
            />
          ) : null}

          <p className={styles.madeWith}>
            Make with
            <Icon name="heart" className={styles.madeWithHeart} aria-hidden />
            in Chennai
          </p>
        </div>
      </PullToRefresh>
    </section>
  );
}

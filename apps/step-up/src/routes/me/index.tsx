import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useActiveStudentContext } from "@/modules/me/child-switcher";
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
import { InstallAppBar } from "@/modules/pwa/install-app-bar";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { HScrollRow } from "@/modules/ui/h-scroll-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./home.module.scss";

export const Route = createFileRoute("/me/")({
  component: MeHomePage,
});

const GOAL_PRESETS = [4, 8, 12, 16];

function MeHomePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { studentId } = useActiveStudentContext();
  const [installBarVisible, setInstallBarVisible] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(8);

  const homeQuery = useQuery({
    queryKey: ["home", studentId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      const query = params.toString();
      return api.get<HomePayload>(`/home${query ? `?${query}` : ""}`);
    },
    enabled: Boolean(studentId),
    staleTime: 30_000,
  });

  const goalMutation = useMutation({
    mutationFn: (target: number) => api.put(`/goals/me`, { target, studentId }),
    onSuccess: async () => {
      setGoalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["home", studentId] });
    },
  });

  const data = homeQuery.data;
  const firstName = data?.student.name.split(" ")[0] || "dancer";
  const bannerCta = data?.hero.cta ?? null;
  const nextClass = data?.nextClass ?? data?.hero.nextClass ?? null;
  const showTrialPromo = data
    ? !(data.hasEnrollment ?? data.progress.length > 0)
    : false;

  return (
    <section className="screen">
      <PullToRefresh
        onRefresh={async () => {
          await homeQuery.refetch();
        }}
      >
        <div className={styles.root}>
          <InstallAppBar onVisibleChange={setInstallBarVisible} />

          {homeQuery.isLoading ? (
            <>
              <SkeletonBlock height="18rem" radius="0" />
              <SkeletonBlock
                height="10rem"
                radius="var(--radius-2xl, 1.25rem)"
              />
              <SkeletonBlock
                height="6rem"
                radius="var(--radius-2xl, 1.25rem)"
              />
            </>
          ) : null}

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

              {!showTrialPromo &&
              !nextClass &&
              data.membership?.needsRenewal ? (
                <TrialPromoCard
                  title="Keep your spot warm"
                  subtitle="Renew your plan so you don't miss the next drop-in"
                  ctaLabel="Renew plan"
                  to="/me/plans"
                />
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
                    onOpen={() => {
                      setGoalDraft(data.goal.target);
                      setGoalOpen(true);
                    }}
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
          ) : null}

          {!homeQuery.isLoading && !homeQuery.isError && !data && studentId ? (
            <EmptyState
              title="Nothing here yet"
              description="Pull to refresh your dance home."
            />
          ) : null}
        </div>
      </PullToRefresh>

      <AppBottomSheet
        isOpen={goalOpen}
        onOpenChange={setGoalOpen}
        title="Monthly session goal"
      >
        <div className={styles.goalSheet}>
          <p>How many sessions do you want this month?</p>
          <div className={styles.goalOptions}>
            {GOAL_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                className={styles.goalOption}
                data-selected={goalDraft === value ? "true" : undefined}
                onClick={() => setGoalDraft(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={goalMutation.isPending}
            onClick={() => goalMutation.mutate(goalDraft)}
          >
            Save goal
          </TouchButton>
        </div>
      </AppBottomSheet>
    </section>
  );
}

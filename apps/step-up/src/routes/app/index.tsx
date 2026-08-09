import { useToastContext } from "@dev-ui/components/toast";
import type { IconName } from "@dev-ui/icons";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import {
  isBookingForTrainer,
  type StudioBooking,
} from "@/modules/bookings/types";
import type { DiscoverBatch } from "@/modules/discover/types";
import { HomeCurrentBatches } from "@/modules/home/home-current-batches";
import { coverUrl, type StudioBranch } from "@/modules/locations/types";
import { AnimatedMetric } from "@/modules/ui/animated-metric";
import type { ExpandableBentoItem } from "@/modules/ui/expandable-bento-grid";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

/** Trainer banner + member home-sections — not needed for OWNER first paint. */
const HomeStudioBanner = lazy(() =>
  import("@/modules/me/home-sections").then((m) => ({
    default: m.HomeStudioBanner,
  })),
);
/** Trainer pending sheet — pulls motion/bento off the OWNER path. */
const BloomPanel = lazy(() =>
  import("@/modules/ui/bloom-panel").then((m) => ({ default: m.BloomPanel })),
);
const ExpandableBentoGrid = lazy(() =>
  import("@/modules/ui/expandable-bento-grid").then((m) => ({
    default: m.ExpandableBentoGrid,
  })),
);
/** Booking review UI (drawer/forms) — load when a request is opened. */
const BookingDetailDrawer = lazy(() =>
  import("@/modules/bookings/booking-detail-drawer").then((m) => ({
    default: m.BookingDetailDrawer,
  })),
);
const BookingReviewPanel = lazy(() =>
  import("@/modules/bookings/booking-review-panel").then((m) => ({
    default: m.BookingReviewPanel,
  })),
);

type Subscription = { id: string; name: string; price: number };
type StudioMember = {
  id: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};
type Studio = { id: string; name: string };

type StudentFunnelPeriod =
  | "lifetime"
  | "this_month"
  | "last_quarter"
  | "this_year_half"
  | "this_year";

type StudentFunnelCounts = {
  total: number;
  active: number;
  signedInOnly: number;
  trialAttended: number;
  completedWithoutPlan: number;
  period: StudentFunnelPeriod;
};

const STUDENT_FUNNEL_PERIOD_CHIPS: Array<{
  id: StudentFunnelPeriod;
  label: string;
}> = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this_month", label: "This month" },
  { id: "last_quarter", label: "Last quarter" },
  { id: "this_year_half", label: "This year half" },
  { id: "this_year", label: "This year" },
];

const STUDENT_FUNNEL_TILES: Array<{
  key: keyof Omit<StudentFunnelCounts, "total" | "period">;
  label: string;
  hint: string;
}> = [
  { key: "active", label: "Active", hint: "In an active batch" },
  { key: "signedInOnly", label: "Signed in only", hint: "No trial yet" },
  {
    key: "trialAttended",
    label: "Trial attended",
    hint: "Tried a class",
  },
  {
    key: "completedWithoutPlan",
    label: "Completed, no plan",
    hint: "Finished batch, inactive membership",
  },
];

function greetingFor(date: Date) {
  const hours = date.getHours();
  if (hours < 12) return "Good morning";
  if (hours < 17) return "Good afternoon";
  return "Good evening";
}

export const Route = createFileRoute("/app/")({
  component: AppDashboardPage,
});

function MetricLink({
  to,
  icon,
  label,
  value,
  hint,
  loading,
}: {
  to: string;
  icon: IconName;
  label: string;
  value: number | null;
  hint: string;
  loading: boolean;
}) {
  return (
    <Link to={to} className={staff.metricCard}>
      <span className={staff.metricLabel}>
        <span className={staff.metricIcon} aria-hidden>
          <Icon name={icon} />
        </span>
        {label}
      </span>
      {loading ? (
        <SkeletonBlock height="1.75rem" width="3rem" />
      ) : (
        <AnimatedMetric className={staff.metricValue} value={value ?? 0} />
      )}
      <span className={staff.metricHint}>{hint}</span>
    </Link>
  );
}

function AppDashboardPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AppDashboardPage");
  const { user } = useAuth();
  const isTrainer = user?.role === "TRAINER";
  const [funnelPeriod, setFunnelPeriod] =
    useState<StudentFunnelPeriod>("lifetime");
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingGridKey, setPendingGridKey] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  // Defer non-critical funnel fetch so late-arriving tile text cannot steal LCP
  // from the auth boot / shell paint under mobile throttle.
  const [funnelEnabled, setFunnelEnabled] = useState(false);
  useEffect(() => {
    if (isTrainer) return;
    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => {
            const id = requestIdleCallback(cb, { timeout: 2500 });
            return () => cancelIdleCallback(id);
          }
        : (cb: () => void) => {
            const id = window.setTimeout(cb, 1);
            return () => window.clearTimeout(id);
          };
    return schedule(() => setFunnelEnabled(true));
  }, [isTrainer]);
  const batches = useQuery({
    queryKey: [
      "batches",
      "home",
      studioId,
      isTrainer ? (user?.id ?? "trainer") : "studio",
    ],
    queryFn: () => {
      const params = new URLSearchParams({ activeOnly: "true" });
      if (isTrainer && user?.id) {
        params.set("trainerId", user.id);
      }
      return api.get<DiscoverBatch[]>(
        `/batches/studio/${studioId}?${params.toString()}`,
      );
    },
    enabled: Boolean(studioId) && (!isTrainer || Boolean(user?.id)),
    staleTime: 30_000,
  });
  const studio = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
    enabled: isTrainer,
    staleTime: 5 * 60 * 1000,
  });
  const branches = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
    enabled: isTrainer,
    staleTime: 5 * 60 * 1000,
  });
  const subscriptions = useQuery({
    queryKey: ["subscriptions", studioId],
    queryFn: () => api.get<Subscription[]>(`/subscriptions/studio/${studioId}`),
    staleTime: 30_000,
  });
  const members = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    staleTime: 30_000,
  });
  const studentFunnel = useQuery({
    queryKey: ["student-funnel", studioId, funnelPeriod],
    queryFn: () =>
      api.get<StudentFunnelCounts>(
        `/users/studio/${studioId}/student-funnel?period=${funnelPeriod}`,
      ),
    enabled: !isTrainer && funnelEnabled,
    staleTime: 30_000,
  });
  const bookings = useQuery({
    queryKey: ["bookings", "studio", studioId],
    queryFn: () => api.get<StudioBooking[]>(`/bookings/studio/${studioId}`),
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: (values: {
      id: string;
      status: string;
      startsAt?: string;
      endsAt?: string;
    }) =>
      api.patch<StudioBooking>(`/bookings/${values.id}/status`, {
        status: values.status,
        ...(values.startsAt && values.endsAt
          ? { startsAt: values.startsAt, endsAt: values.endsAt }
          : {}),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "studio", studioId],
      });
      void queryClient.invalidateQueries({ queryKey: ["calendar"] });
      setPendingGridKey((key) => key + 1);
      setSelectedBookingId(null);
      if (variables.status === "CONFIRMED") {
        toast({
          title: "Booking confirmed",
          description: "The student will be notified.",
          variant: "success",
        });
      } else if (variables.status === "CANCELLED") {
        toast({
          title: "Booking declined",
          description: "The request was cancelled.",
          variant: "success",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Couldn’t update booking",
        description:
          error instanceof Error ? error.message : "Could not update booking.",
        variant: "error",
      });
    },
  });

  const currentBatches = batches.data ?? [];
  const activeBatches = batches.data != null ? currentBatches.length : null;
  const studentCount =
    members.data?.filter((member) => member.role === "STUDENT").length ?? null;
  const trainerCount =
    members.data?.filter((member) => member.role === "TRAINER").length ?? null;
  const subscriptionCount = subscriptions.data?.length ?? null;

  const pending = useMemo(() => {
    const items = (bookings.data ?? []).filter(
      (booking) => booking.status === "PENDING",
    );
    if (!isTrainer || !user?.id) return items;
    return items.filter((booking) => isBookingForTrainer(booking, user.id));
  }, [bookings.data, isTrainer, user?.id]);

  const pendingItems: ExpandableBentoItem[] = useMemo(
    () =>
      pending.map((booking) => {
        const studentName = booking.student?.name ?? booking.studentId;
        const typeLabel = booking.type.replaceAll("_", " ");
        const subtitle = [typeLabel, booking.batch?.name]
          .filter(Boolean)
          .join(" · ");

        return {
          id: booking.id,
          title: studentName,
          subtitle,
          description: booking.notes
            ? `${subtitle} · ${booking.notes}`
            : subtitle,
          media: (
            <span className={staff.bentoInitial} aria-hidden>
              {studentName.slice(0, 1).toUpperCase() || "?"}
            </span>
          ),
          content: (
            <BookingReviewPanel
              booking={booking}
              isPending={updateStatus.isPending}
              onConfirm={(times) =>
                updateStatus.mutate({
                  id: booking.id,
                  status: "CONFIRMED",
                  ...times,
                })
              }
              onDecline={() =>
                updateStatus.mutate({
                  id: booking.id,
                  status: "CANCELLED",
                })
              }
            />
          ),
        };
      }),
    [pending, updateStatus.isPending, updateStatus.mutate],
  );

  const selectedBooking =
    pending.find((booking) => booking.id === selectedBookingId) ?? null;

  const anyError =
    batches.isError ||
    subscriptions.isError ||
    members.isError ||
    bookings.isError ||
    (!isTrainer && studentFunnel.isError);

  async function refresh() {
    await Promise.all([
      batches.refetch(),
      subscriptions.refetch(),
      members.refetch(),
      bookings.refetch(),
      ...(!isTrainer ? [studentFunnel.refetch()] : []),
      ...(isTrainer ? [studio.refetch(), branches.refetch()] : []),
    ]);
  }

  const bannerBranch = branches.data?.[0] ?? null;
  const firstName = user?.name?.split(" ")[0] || "coach";

  const body = (
    <PullToRefresh onRefresh={refresh}>
      <div className={staff.section}>
        {anyError ? (
          <ErrorState
            description="Some studio stats could not be loaded."
            action={
              <TouchButton variant="primary" onClick={() => void refresh()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {isTrainer ? (
          <>
            <HomeCurrentBatches
              title="Your batches"
              batches={currentBatches}
              loading={batches.isLoading}
              emptyTitle="No batches yet"
              emptyDescription="Batches you’re assigned to will show up here."
            />
            <div className={staff.section}>
              <p className={staff.sectionTitle}>Needs attention</p>
              {bookings.isLoading ? (
                <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
              ) : (
                <button
                  type="button"
                  className={staff.metricCard}
                  onClick={() => setPendingOpen(true)}
                  aria-label={`${pending.length} pending requests for your batches`}
                >
                  <span className={staff.metricLabel}>
                    <span className={staff.metricIcon} aria-hidden>
                      <Icon name="clipboard" />
                    </span>
                    Pending requests
                  </span>
                  <AnimatedMetric
                    className={staff.metricValue}
                    value={pending.length}
                  />
                  <span className={staff.metricHint}>
                    {pending.length === 0
                      ? "No requests waiting on your batches"
                      : "Tap to review and approve"}
                  </span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={staff.metrics} data-testid="owner-metric-tiles">
              <MetricLink
                to="/app/batches"
                icon={ENTITY_ICONS.batch}
                label="Batches"
                value={activeBatches}
                hint="Active classes"
                loading={batches.isLoading}
              />
              <MetricLink
                to="/app/students"
                icon={ENTITY_ICONS.student}
                label="Students"
                value={studentCount}
                hint="All registered"
                loading={members.isLoading}
              />
              <MetricLink
                to="/app/trainers"
                icon={ENTITY_ICONS.trainer}
                label="Trainers"
                value={trainerCount}
                hint="Teaching team"
                loading={members.isLoading}
              />
              <MetricLink
                to="/app/subscriptions"
                icon="clipboard"
                label="Subscriptions"
                value={subscriptionCount}
                hint="Memberships"
                loading={subscriptions.isLoading}
              />
            </div>
            <HomeCurrentBatches
              title="Current batches"
              batches={currentBatches}
              loading={batches.isLoading}
              emptyTitle="No active batches"
              emptyDescription="Create a batch to start filling classes."
            />
          </>
        )}

        {!isTrainer ? (
          <div className={staff.section} data-testid="student-pipeline">
            <p className={staff.sectionTitle}>Student pipeline</p>
            <FilterChipRow
              chips={STUDENT_FUNNEL_PERIOD_CHIPS}
              selected={[funnelPeriod]}
              onToggle={(id) => setFunnelPeriod(id as StudentFunnelPeriod)}
            />
            {studentFunnel.isLoading ? (
              <div className={staff.statGrid}>
                {STUDENT_FUNNEL_TILES.map((tile) => (
                  <SkeletonBlock
                    key={tile.key}
                    height="6.25rem"
                    radius="var(--radius-2xl)"
                  />
                ))}
              </div>
            ) : null}
            {studentFunnel.data ? (
              <div className={staff.statGrid} data-testid="funnel-tiles">
                {STUDENT_FUNNEL_TILES.map((tile) => (
                  <Link
                    key={tile.key}
                    to="/app/students"
                    search={{
                      stage: tile.key,
                      period: funnelPeriod,
                    }}
                    className={staff.linkWrap}
                    data-testid={`funnel-tile-${tile.key}`}
                    aria-label={`${tile.label}: ${studentFunnel.data[tile.key]}. ${tile.hint}`}
                  >
                    <div className={staff.statTile}>
                      <span className={staff.statLabel}>{tile.label}</span>
                      <AnimatedMetric
                        className={staff.statValue}
                        value={studentFunnel.data[tile.key]}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {!isTrainer ? (
          <div className={staff.section}>
            <p className={staff.sectionTitle}>Needs attention</p>
            <div className={staff.attentionBody}>
              {bookings.isLoading ? (
                <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
              ) : null}
              {!bookings.isLoading && pending.length === 0 ? (
                <EmptyState
                  title="All clear"
                  description="No pending bookings to approve."
                />
              ) : null}
              {pending.length > 0 ? (
                <>
                  {/*
                    Compact summary (not a long booking list): under Lighthouse the
                    pending row meta ("TRIAL · … · Smoke load booking N") became LCP
                    only after /bookings returned (~5–8s). Keep shell title as LCP;
                    full request details stay on /app/bookings + the drawer.
                  */}
                  <button
                    type="button"
                    className={staff.metricCard}
                    onClick={() => setSelectedBookingId(pending[0]?.id ?? null)}
                    aria-label={`${pending.length} pending booking requests`}
                    data-testid="pending-requests-summary"
                  >
                    <span className={staff.metricLabel}>
                      <span className={staff.metricIcon} aria-hidden>
                        <Icon name="clipboard" />
                      </span>
                      Pending requests
                    </span>
                    <AnimatedMetric
                      className={staff.metricValue}
                      value={pending.length}
                    />
                    <span className={staff.metricHint}>
                      Tap to review the next request
                    </span>
                  </button>
                  <TouchButton variant="quiet" fullWidth>
                    <Link to="/app/bookings">Open bookings</Link>
                  </TouchButton>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isTrainer ? (
          <div className={staff.section}>
            <p className={staff.sectionTitle}>Shortcuts</p>
            <div className={staff.quickLinks}>
              <Link to="/app/retention" className={staff.quickLink}>
                Retention
                <span className={staff.quickLinkMeta}>Renewals</span>
              </Link>
              <Link to="/app/payments" className={staff.quickLink}>
                Payments
                <span className={staff.quickLinkMeta}>Earnings</span>
              </Link>
              <Link to="/app/invoices" className={staff.quickLink}>
                Invoices
                <span className={staff.quickLinkMeta}>Mark paid</span>
              </Link>
              <Link to="/app/settings" className={staff.quickLink}>
                Settings
                <span className={staff.quickLinkMeta}>Studio</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className={staff.section}>
            <p className={staff.sectionTitle}>Shortcuts</p>
            <div className={staff.quickLinks}>
              <Link to="/app/batches" className={staff.quickLink}>
                Batches
                <span className={staff.quickLinkMeta}>Your classes</span>
              </Link>
              <Link
                to="/app/calendar"
                search={{
                  view: "week",
                  focus: new Date().toISOString(),
                }}
                className={staff.quickLink}
              >
                Calendar
                <span className={staff.quickLinkMeta}>Schedule</span>
              </Link>
              <Link to="/app/bookings" className={staff.quickLink}>
                Bookings
                <span className={staff.quickLinkMeta}>All requests</span>
              </Link>
              <Link to="/app/payments" className={staff.quickLink}>
                Payments
                <span className={staff.quickLinkMeta}>Earnings</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {isTrainer ? (
        <Suspense fallback={null}>
          <BloomPanel
            isOpen={pendingOpen}
            onOpenChange={setPendingOpen}
            title={
              pending.length > 0
                ? `${pending.length} pending request${pending.length === 1 ? "" : "s"}`
                : "Pending requests"
            }
          >
            {pending.length === 0 ? (
              <EmptyState
                title="All clear"
                description="No pending requests for your batches right now."
              />
            ) : (
              <Suspense fallback={<SkeletonBlock height="12rem" />}>
                <ExpandableBentoGrid
                  key={pendingGridKey}
                  items={pendingItems}
                  aria-label="Pending requests for your batches"
                />
              </Suspense>
            )}
          </BloomPanel>
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <BookingDetailDrawer
            booking={selectedBooking}
            isOpen={selectedBooking != null}
            onOpenChange={(open) => {
              if (!open) setSelectedBookingId(null);
            }}
            isPending={updateStatus.isPending}
            onConfirm={(times) => {
              if (!selectedBooking) return;
              updateStatus.mutate({
                id: selectedBooking.id,
                status: "CONFIRMED",
                ...times,
              });
            }}
            onDecline={() => {
              if (!selectedBooking) return;
              updateStatus.mutate({
                id: selectedBooking.id,
                status: "CANCELLED",
              });
            }}
          />
        </Suspense>
      )}
    </PullToRefresh>
  );

  if (isTrainer) {
    return (
      <section className="screen" aria-label="Home">
        <Suspense
          fallback={<SkeletonBlock height="12rem" radius="var(--radius-2xl)" />}
        >
          <HomeStudioBanner
            variant="app"
            banner={
              bannerBranch
                ? {
                    branchId: bannerBranch.id,
                    branchName: bannerBranch.name,
                    imageUrl: coverUrl(bannerBranch),
                    desktopImageUrl: coverUrl(bannerBranch),
                    altText:
                      bannerBranch.coverMedia?.altText ?? bannerBranch.name,
                  }
                : null
            }
            studioName={studio.data?.name ?? null}
            title={`${greetingFor(new Date())}, ${firstName} — let's teach`}
            cta={{
              label: "View your schedule",
              to: "/app/calendar",
              icon: "calendar",
            }}
          />
        </Suspense>
        {body}
      </section>
    );
  }

  return (
    <Screen
      title="Home"
      subtitle={`${greetingFor(new Date())}, ${firstName} — here's your studio`}
    >
      {body}
    </Screen>
  );
}

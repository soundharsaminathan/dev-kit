import type { IconName } from "@dev-ui/icons";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { coverUrl, type StudioBranch } from "@/modules/locations/types";
import { HomeStudioBanner } from "@/modules/me/home-sections";
import { AnimatedMetric } from "@/modules/ui/animated-metric";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type Batch = { id: string; name: string; active: boolean };
type Plan = { id: string; name: string; priceMonthly: number };
type StudioMember = {
  id: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};
type Booking = {
  id: string;
  type: string;
  status: string;
  studentId: string;
  notes?: string | null;
  student?: { id: string; name: string; email: string } | null;
};
type Studio = { id: string; name: string };

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTrainer = user?.role === "TRAINER";
  const batches = useQuery({
    queryKey: ["batches", STUDIO_ID],
    queryFn: () => api.get<Batch[]>(`/batches/studio/${STUDIO_ID}`),
  });
  const studio = useQuery({
    queryKey: ["studio", STUDIO_ID],
    queryFn: () => api.get<Studio>(`/studios/${STUDIO_ID}`),
    enabled: isTrainer,
    staleTime: 5 * 60 * 1000,
  });
  const branches = useQuery({
    queryKey: ["branches", STUDIO_ID],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${STUDIO_ID}/branches`),
    enabled: isTrainer,
    staleTime: 5 * 60 * 1000,
  });
  const plans = useQuery({
    queryKey: ["plans", STUDIO_ID],
    queryFn: () => api.get<Plan[]>(`/plans/studio/${STUDIO_ID}`),
  });
  const members = useQuery({
    queryKey: ["studio-members", STUDIO_ID],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${STUDIO_ID}`),
  });
  const bookings = useQuery({
    queryKey: ["bookings", "studio", STUDIO_ID],
    queryFn: () => api.get<Booking[]>(`/bookings/studio/${STUDIO_ID}`),
  });

  const activeBatches =
    batches.data?.filter((batch) => batch.active).length ?? null;
  const studentCount =
    members.data?.filter((member) => member.role === "STUDENT").length ?? null;
  const trainerCount =
    members.data?.filter((member) => member.role === "TRAINER").length ?? null;
  const planCount = plans.data?.length ?? null;

  const pending = useMemo(
    () =>
      (bookings.data ?? []).filter((booking) => booking.status === "PENDING"),
    [bookings.data],
  );

  const pendingItems: ExpandableBentoItem[] = useMemo(
    () =>
      pending.map((booking) => {
        const studentName = booking.student?.name ?? booking.studentId;
        const typeLabel = booking.type.replaceAll("_", " ");
        return {
          id: booking.id,
          title: studentName,
          subtitle: typeLabel,
          description: booking.notes
            ? `${typeLabel} · ${booking.notes}`
            : typeLabel,
          media: (
            <span className={staff.bentoInitial} aria-hidden>
              {studentName.slice(0, 1).toUpperCase() || "?"}
            </span>
          ),
          actionLabel: "Review",
          onAction: () => {
            void navigate({ to: "/app/bookings" });
          },
          content: booking.notes ? (
            <p className={staff.attentionMeta}>{booking.notes}</p>
          ) : (
            <p className={staff.attentionMeta}>
              Tap Review to confirm or decline this request.
            </p>
          ),
        };
      }),
    [navigate, pending],
  );

  const anyError =
    batches.isError || plans.isError || members.isError || bookings.isError;

  async function refresh() {
    await Promise.all([
      batches.refetch(),
      plans.refetch(),
      members.refetch(),
      bookings.refetch(),
      ...(isTrainer ? [studio.refetch(), branches.refetch()] : []),
    ]);
  }

  const bannerBranch = branches.data?.[0] ?? null;
  const firstName = user?.name.split(" ")[0] || "coach";

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

        <div className={staff.metrics}>
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
            hint="Enrolled members"
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
            to="/app/plans"
            icon="clipboard"
            label="Plans"
            value={planCount}
            hint="Memberships"
            loading={plans.isLoading}
          />
        </div>

        <div className={staff.section}>
          <p className={staff.sectionTitle}>Needs attention</p>
          {bookings.isLoading ? (
            <SkeletonBlock height="5rem" radius="var(--radius-2xl)" />
          ) : null}
          {!bookings.isLoading && pending.length === 0 ? (
            <EmptyState
              title="All clear"
              description="No pending bookings to approve."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/bookings/new">Add booking</Link>
                </TouchButton>
              }
            />
          ) : null}
          {pending.length > 0 ? (
            <div className={staff.list}>
              <ExpandableBentoGrid
                items={pendingItems}
                aria-label="Pending booking requests"
              />
              <TouchButton variant="quiet" fullWidth>
                <Link to="/app/bookings">Open bookings</Link>
              </TouchButton>
            </div>
          ) : null}
        </div>

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
      </div>
    </PullToRefresh>
  );

  if (isTrainer) {
    return (
      <section className="screen" aria-label="Home">
        <HomeStudioBanner
          variant="app"
          banner={
            bannerBranch
              ? {
                  branchId: bannerBranch.id,
                  branchName: bannerBranch.name,
                  imageUrl: coverUrl(bannerBranch),
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
        {body}
      </section>
    );
  }

  return (
    <Screen title="Home" subtitle="A calm glance at your studio today.">
      {body}
    </Screen>
  );
}

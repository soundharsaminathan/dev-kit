import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock, SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudentStudioProfile = {
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
    styles: string[];
  };
  batches: Array<{
    id: string;
    name: string;
    active: boolean;
    category: "KIDS" | "ADULTS";
  }>;
  subscriptions: Array<{
    id: string;
    status: "ACTIVE" | "DUE" | "EXPIRED";
    periodStart: string;
    periodEnd: string;
    creditsRemaining?: number | null;
    plan: {
      id: string;
      name: string;
      type: string;
      priceMonthly: number | string;
    };
  }>;
  attendance: {
    total: number;
    present: number;
    absent: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
    paymentMethod?: "CASH" | "UPI_MANUAL" | null;
    paidAt?: string | null;
  }>;
};

export const Route = createFileRoute("/app/students/$id")({
  component: StudentDetailPage,
});

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function subscriptionStatusLabel(
  status: StudentStudioProfile["subscriptions"][number]["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "DUE":
      return "Due";
    case "EXPIRED":
      return "Expired";
  }
}

function invoiceStatusVariant(
  status: StudentStudioProfile["invoices"][number]["status"],
) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "OVERDUE":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function StudentDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });

  const query = useQuery({
    queryKey: ["student-profile", STUDIO_ID, id],
    queryFn: () =>
      api.get<StudentStudioProfile>(
        `/users/studio/${STUDIO_ID}/students/${id}`,
      ),
  });

  return (
    <Screen
      title={query.data?.student.name ?? "Student"}
      subtitle="Enrollment, billing, and attendance."
      showBack
      backTo="/app/students"
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        {query.isLoading ? (
          <div className={staff.section}>
            <SkeletonBlock height="5rem" radius="var(--radius-2xl)" />
            <div className={staff.metrics}>
              <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
            </div>
            <SkeletonCardList count={3} />
          </div>
        ) : null}

        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load this student."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {query.data ? (
          <div className={staff.section}>
            <div className={staff.softPanel}>
              <div className={staff.rowWithAvatar}>
                <Avatar size="lg" className={staff.trainerAvatar}>
                  {query.data.student.photoUrl ? (
                    <AvatarImage
                      src={query.data.student.photoUrl}
                      alt={query.data.student.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {query.data.student.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={staff.rowBody}>
                  <div className={staff.attentionTop}>
                    <span className={staff.rowTitle}>
                      {query.data.student.name}
                    </span>
                    <Badge appearance="subtle">Student</Badge>
                  </div>
                  <p className={staff.rowMeta}>{query.data.student.email}</p>
                  {query.data.student.phone ? (
                    <p className={staff.rowMeta}>{query.data.student.phone}</p>
                  ) : null}
                  {query.data.student.styles.length > 0 ? (
                    <p className={staff.rowMeta}>
                      {query.data.student.styles.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Attendance</h2>
              <div className={staff.metrics}>
                <div className={staff.metricCard}>
                  <span className={staff.metricLabel}>Present</span>
                  <span className={staff.metricValue}>
                    {query.data.attendance.present}
                  </span>
                </div>
                <div className={staff.metricCard}>
                  <span className={staff.metricLabel}>Absent</span>
                  <span className={staff.metricValue}>
                    {query.data.attendance.absent}
                  </span>
                </div>
              </div>
              {query.data.attendance.total === 0 ? (
                <p className={staff.panelDesc}>
                  No attendance records yet for this student.
                </p>
              ) : null}
            </section>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Batches</h2>
              {query.data.batches.length === 0 ? (
                <EmptyState
                  icon={ENTITY_ICONS.batch}
                  title="No batches"
                  description="This student is not enrolled in any batches yet."
                />
              ) : (
                <div className={staff.list}>
                  {query.data.batches.map((batch) => (
                    <PressableCard
                      key={batch.id}
                      onClick={() =>
                        void navigate({
                          to: "/app/batches/$id",
                          params: { id: batch.id },
                        })
                      }
                    >
                      <div className={staff.rowCard}>
                        <div className={staff.attentionTop}>
                          <span className={staff.rowTitle}>{batch.name}</span>
                          <Badge variant={batch.active ? "success" : "neutral"}>
                            {batch.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className={staff.rowMeta}>
                          {batch.category === "KIDS" ? "Kids" : "Adults"}
                        </p>
                      </div>
                    </PressableCard>
                  ))}
                </div>
              )}
            </section>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Subscriptions</h2>
              {query.data.subscriptions.length === 0 ? (
                <EmptyState
                  title="No subscriptions"
                  description="Assign a plan to start billing this student."
                />
              ) : (
                <div className={staff.list}>
                  {query.data.subscriptions.map((subscription) => (
                    <div key={subscription.id} className={staff.attentionCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.attentionTitle}>
                          {subscription.plan.name}
                        </span>
                        <Badge
                          variant={
                            subscription.status === "ACTIVE"
                              ? "success"
                              : subscription.status === "DUE"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {subscriptionStatusLabel(subscription.status)}
                        </Badge>
                      </div>
                      <p className={staff.attentionMeta}>
                        {formatDate(subscription.periodStart)} –{" "}
                        {formatDate(subscription.periodEnd)}
                      </p>
                      <p className={staff.attentionMeta}>
                        {formatInr(Number(subscription.plan.priceMonthly))}/mo
                        {subscription.creditsRemaining != null
                          ? ` · ${subscription.creditsRemaining} credits left`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Invoices</h2>
              {query.data.invoices.length === 0 ? (
                <EmptyState
                  title="No invoices"
                  description="Invoices will appear here once billing starts."
                />
              ) : (
                <div className={staff.list}>
                  {query.data.invoices.map((invoice) => (
                    <div key={invoice.id} className={staff.attentionCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.attentionTitle}>
                          {formatInr(invoice.amount)}
                        </span>
                        <Badge variant={invoiceStatusVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      {invoice.paidAt ? (
                        <p className={staff.attentionMeta}>
                          Paid {formatDate(invoice.paidAt)}
                          {invoice.paymentMethod
                            ? ` · ${invoice.paymentMethod.replace("_", " ")}`
                            : ""}
                        </p>
                      ) : (
                        <p className={staff.attentionMeta}>Not paid yet</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </PullToRefresh>
    </Screen>
  );
}

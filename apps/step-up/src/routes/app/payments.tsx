import { Badge } from "@dev-ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { FormInput } from "@/modules/ui/form-input";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock, SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudioMember = {
  id: string;
  name: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};

type TrainerPaymentAnalytics = {
  trainerId: string;
  trainerName: string;
  from: string | null;
  to: string | null;
  studentCount: number;
  invoiceCount: number;
  totals: {
    collected: number;
    pending: number;
    overdue: number;
    platformFees: number;
    netCollected: number;
  };
  byPaymentMethod: {
    CASH: { count: number; amount: number };
    UPI_MANUAL: { count: number; amount: number };
  };
  byBatch: Array<{
    batchId: string;
    batchName: string;
    studentCount: number;
    invoiceCount: number;
    collected: number;
    pending: number;
    overdue: number;
  }>;
  invoices: Array<{
    id: string;
    studentName: string;
    amount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
    paymentMethod: "CASH" | "UPI_MANUAL" | null;
    paidAt: string | null;
  }>;
};

type RangePreset = "all" | "month" | "30d" | "custom";

const RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
] as const;

export const Route = createFileRoute("/app/payments")({
  component: PaymentsPage,
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonthInput() {
  const now = new Date();
  return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function daysAgoInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

function startOfDayIso(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function endOfDayIso(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRangeLabel(from: string, to: string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (from && to) {
    return `${formatter.format(new Date(`${from}T00:00:00`))} – ${formatter.format(new Date(`${to}T00:00:00`))}`;
  }
  if (from) {
    return `From ${formatter.format(new Date(`${from}T00:00:00`))}`;
  }
  if (to) {
    return `Until ${formatter.format(new Date(`${to}T00:00:00`))}`;
  }
  return "All time";
}

function detectPreset(from: string, to: string): RangePreset {
  if (!from && !to) {
    return "all";
  }
  const today = formatDateInput(new Date());
  if (from === startOfMonthInput() && to === today) {
    return "month";
  }
  if (from === daysAgoInput(30) && to === today) {
    return "30d";
  }
  return "custom";
}

function PaymentsPage() {
  const { user } = useAuth();
  const api = useApi();
  const isTrainer = user?.role === "TRAINER";
  const isStaff = user?.role === "OWNER" || user?.role === "STAFF";
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    null,
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const rangePreset = detectPreset(fromDate, toDate);

  const membersQuery = useQuery({
    queryKey: ["studio-members", STUDIO_ID],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${STUDIO_ID}`),
    enabled: isStaff,
  });

  const trainers = useMemo(
    () =>
      membersQuery.data?.filter((member) => member.role === "TRAINER") ?? [],
    [membersQuery.data],
  );

  const trainerId = isTrainer
    ? (user?.id ?? null)
    : (selectedTrainerId ?? trainers[0]?.id ?? null);

  const analyticsQuery = useQuery({
    queryKey: [
      "billing",
      "trainer-analytics",
      trainerId,
      STUDIO_ID,
      fromDate,
      toDate,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ studioId: STUDIO_ID });
      if (fromDate) {
        params.set("from", startOfDayIso(fromDate));
      }
      if (toDate) {
        params.set("to", endOfDayIso(toDate));
      }
      return api.get<TrainerPaymentAnalytics>(
        `/billing/analytics/trainer/${trainerId}?${params.toString()}`,
      );
    },
    enabled: Boolean(trainerId) && (isTrainer || isStaff),
  });

  function applyPreset(id: string) {
    if (id === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    if (id === "month") {
      setFromDate(startOfMonthInput());
      setToDate(formatDateInput(new Date()));
      return;
    }
    if (id === "30d") {
      setFromDate(daysAgoInput(30));
      setToDate(formatDateInput(new Date()));
    }
  }

  async function refresh() {
    await Promise.all([
      isStaff ? membersQuery.refetch() : Promise.resolve(),
      trainerId ? analyticsQuery.refetch() : Promise.resolve(),
    ]);
  }

  if (!isTrainer && !isStaff) {
    return (
      <Screen
        title="Payments"
        subtitle="Trainer payment analytics are limited to trainers and studio admins."
      >
        <EmptyState
          title="No access"
          description="Ask a studio admin if you need payment insights."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Payments"
      subtitle={
        isTrainer
          ? "Collected and outstanding payments for your batches."
          : "Trainer-level payment analytics across the studio."
      }
    >
      <PullToRefresh onRefresh={refresh}>
        <div className={staff.section}>
          {isStaff ? (
            membersQuery.isLoading ? (
              <SkeletonBlock height="3rem" />
            ) : membersQuery.isError ? (
              <ErrorState
                description={
                  membersQuery.error instanceof Error
                    ? membersQuery.error.message
                    : "Could not load trainers."
                }
              />
            ) : trainers.length === 0 ? (
              <EmptyState
                icon={ENTITY_ICONS.trainer}
                title="No trainers"
                description="Add a trainer to see payment analytics."
              />
            ) : (
              <div className={staff.softPanel}>
                <Select
                  label="Trainer"
                  placeholder="Select a trainer"
                  selectedKey={trainerId}
                  onSelectionChange={(key) =>
                    setSelectedTrainerId(key as string)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} id={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : null}

          {trainerId ? (
            <>
              <div className={staff.softPanel}>
                <p className={staff.panelTitle}>Date range</p>
                <p className={staff.panelDesc}>
                  Filter collected totals by payment date. Pending and overdue
                  invoices stay visible.
                </p>
                <FilterChipRow
                  chips={[...RANGE_PRESETS]}
                  selected={[rangePreset === "custom" ? "" : rangePreset]}
                  onToggle={applyPreset}
                />
                <div className={staff.filterGrid}>
                  <FormInput
                    label="From"
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={setFromDate}
                  />
                  <FormInput
                    label="To"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={setToDate}
                  />
                </div>
              </div>

              {analyticsQuery.isLoading ? (
                <>
                  <div className={staff.statGrid}>
                    <SkeletonBlock
                      height="6.25rem"
                      radius="var(--radius-2xl)"
                    />
                    <SkeletonBlock
                      height="6.25rem"
                      radius="var(--radius-2xl)"
                    />
                    <SkeletonBlock
                      height="6.25rem"
                      radius="var(--radius-2xl)"
                    />
                    <SkeletonBlock
                      height="6.25rem"
                      radius="var(--radius-2xl)"
                    />
                  </div>
                  <SkeletonCardList count={2} />
                </>
              ) : null}

              {analyticsQuery.isError ? (
                <ErrorState
                  description={
                    analyticsQuery.error instanceof Error
                      ? analyticsQuery.error.message
                      : "Could not load payment analytics."
                  }
                  action={
                    <TouchButton
                      variant="primary"
                      onClick={() => analyticsQuery.refetch()}
                    >
                      Try again
                    </TouchButton>
                  }
                />
              ) : null}

              {analyticsQuery.data ? (
                <>
                  <div className={staff.statGrid}>
                    <div className={staff.statTile}>
                      <span className={staff.statLabel}>Collected</span>
                      <span className={staff.statValue}>
                        {formatInr(analyticsQuery.data.totals.collected)}
                      </span>
                    </div>
                    <div className={staff.statTile}>
                      <span className={staff.statLabel}>Pending</span>
                      <span className={staff.statValue}>
                        {formatInr(analyticsQuery.data.totals.pending)}
                      </span>
                    </div>
                    <div className={staff.statTile}>
                      <span className={staff.statLabel}>Overdue</span>
                      <span className={staff.statValue}>
                        {formatInr(analyticsQuery.data.totals.overdue)}
                      </span>
                    </div>
                    <div className={staff.statTile}>
                      <span className={staff.statLabel}>Net collected</span>
                      <span className={staff.statValue}>
                        {formatInr(analyticsQuery.data.totals.netCollected)}
                      </span>
                      <span className={staff.rowMeta}>
                        After{" "}
                        {formatInr(analyticsQuery.data.totals.platformFees)}{" "}
                        fees
                      </span>
                    </div>
                  </div>

                  <div className={staff.softPanel}>
                    <p className={staff.panelTitle}>Coverage</p>
                    <p className={staff.panelDesc}>
                      {analyticsQuery.data.studentCount} students ·{" "}
                      {analyticsQuery.data.invoiceCount} invoices ·{" "}
                      {formatRangeLabel(fromDate, toDate)}
                    </p>
                    <p className={staff.rowMeta}>
                      Cash: {analyticsQuery.data.byPaymentMethod.CASH.count} ·{" "}
                      {formatInr(
                        analyticsQuery.data.byPaymentMethod.CASH.amount,
                      )}
                    </p>
                    <p className={staff.rowMeta}>
                      UPI:{" "}
                      {analyticsQuery.data.byPaymentMethod.UPI_MANUAL.count} ·{" "}
                      {formatInr(
                        analyticsQuery.data.byPaymentMethod.UPI_MANUAL.amount,
                      )}
                    </p>
                  </div>

                  {analyticsQuery.data.byBatch.length > 0 ? (
                    <div className={staff.section}>
                      <p className={staff.sectionTitle}>By batch</p>
                      <div className={staff.list}>
                        {analyticsQuery.data.byBatch.map((batch) => (
                          <PressableCard key={batch.batchId} asDiv>
                            <div className={staff.rowCard}>
                              <span className={staff.rowTitle}>
                                {batch.batchName}
                              </span>
                              <p className={staff.rowMeta}>
                                {batch.studentCount} students ·{" "}
                                {batch.invoiceCount} invoices
                              </p>
                              <p className={staff.rowMeta}>
                                Collected {formatInr(batch.collected)} · Pending{" "}
                                {formatInr(batch.pending)} · Overdue{" "}
                                {formatInr(batch.overdue)}
                              </p>
                            </div>
                          </PressableCard>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {analyticsQuery.data.invoices.length > 0 ? (
                    <div className={staff.section}>
                      <p className={staff.sectionTitle}>Invoices</p>
                      <div className={staff.list}>
                        {analyticsQuery.data.invoices.map((invoice) => (
                          <PressableCard key={invoice.id} asDiv>
                            <div className={staff.rowCard}>
                              <div className={staff.attentionTop}>
                                <span className={staff.rowTitle}>
                                  {invoice.studentName}
                                </span>
                                <Badge
                                  variant={
                                    invoice.status === "PAID"
                                      ? "success"
                                      : invoice.status === "OVERDUE"
                                        ? "danger"
                                        : "neutral"
                                  }
                                >
                                  {invoice.status}
                                </Badge>
                              </div>
                              <p className={staff.rowMeta}>
                                {formatInr(invoice.amount)}
                                {invoice.paymentMethod
                                  ? ` · ${invoice.paymentMethod === "CASH" ? "Cash" : "UPI"}`
                                  : ""}
                              </p>
                            </div>
                          </PressableCard>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

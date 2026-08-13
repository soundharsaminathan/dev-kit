import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "@dev-ui/components/chart";
import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarTrack,
} from "@dev-ui/components/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import { Tooltip, TooltipContent } from "@dev-ui/components/tooltip";
import type { IconName } from "@dev-ui/icons";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import styles from "@/modules/payments/payments-dashboard.module.scss";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock, SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

const ALL_TRAINERS_ID = "all";

type StudioMember = {
  id: string;
  name: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
  photoUrl?: string | null;
};

type AnalyticsBucket = "day" | "week" | "month";

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
    refunded: number;
    platformFees: number;
    netCollected: number;
  };
  byStatus: Record<
    "PAID" | "PENDING" | "OVERDUE" | "REFUNDED",
    { count: number; amount: number }
  >;
  byPaymentMethod: {
    CASH: { count: number; amount: number };
    UPI_MANUAL: { count: number; amount: number };
    RAZORPAY: { count: number; amount: number };
  };
  byBatch: Array<{
    batchId: string;
    batchName: string;
    studentCount: number;
    invoiceCount: number;
    collected: number;
    pending: number;
    overdue: number;
    refunded: number;
  }>;
  invoices: Array<{
    id: string;
    studentId: string;
    studentName: string;
    amount: number;
    status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
    paymentMethod: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
    paidAt: string | null;
  }>;
  series: Array<{
    start: string;
    end: string;
    collected: number;
    netCollected: number;
    invoiceCount: number;
  }>;
  comparison: {
    previousFrom: string | null;
    previousTo: string | null;
    collected: number;
    netCollected: number;
    netCollectedDelta: number;
    netCollectedDeltaPct: number | null;
    collectedDeltaPct: number | null;
  };
  pendingPayments: Array<{
    invoiceId: string;
    studentId: string;
    studentName: string;
    amount: number;
    status: "PENDING" | "OVERDUE";
    dueDate: string | null;
    batchId: string | null;
    batchName: string | null;
  }>;
};

type RangePreset = "all" | "7d" | "30d" | "month" | "3m" | "1y" | "custom";
type ChartType = "bar" | "area" | "line";

const CHART_TYPES = [
  { id: "bar", label: "Bar", icon: "chart-bar" as const },
  { id: "area", label: "Area", icon: "activity" as const },
  { id: "line", label: "Line", icon: "chart-line" as const },
] as const;

const PERIOD_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "7d", label: "Last 7 days" },
  { id: "3m", label: "Last 3 months" },
  { id: "1y", label: "Last year" },
  { id: "custom", label: "Custom" },
] as const;

const METHOD_LABELS = {
  CASH: "Cash",
  UPI_MANUAL: "UPI",
  RAZORPAY: "Razorpay",
} as const;

const revenueChartConfig = {
  netCollected: {
    label: "Net earnings",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export const Route = createFileRoute("/app/payments")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
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

function monthsAgoInput(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
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

function formatCompactInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function detectPreset(from: string, to: string): RangePreset {
  if (!from && !to) {
    return "all";
  }
  const today = formatDateInput(new Date());
  if (from === startOfMonthInput() && to === today) {
    return "month";
  }
  if (from === daysAgoInput(7) && to === today) {
    return "7d";
  }
  if (from === daysAgoInput(30) && to === today) {
    return "30d";
  }
  if (from === monthsAgoInput(3) && to === today) {
    return "3m";
  }
  if (from === monthsAgoInput(12) && to === today) {
    return "1y";
  }
  return "custom";
}

function bucketForPreset(preset: RangePreset): AnalyticsBucket {
  if (preset === "7d" || preset === "30d") {
    return "day";
  }
  if (preset === "3m") {
    return "week";
  }
  return "month";
}

function formatSeriesLabel(start: string, bucket: AnalyticsBucket) {
  const date = new Date(start);
  if (bucket === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDeltaPct(value: number | null) {
  if (value == null) {
    return "— vs prior period";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}% from prior period`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function PaymentsPage() {
  const { user } = useAuth();
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const isTrainer = user?.role === "TRAINER";
  const isStaff = user?.role === "OWNER" || user?.role === "STAFF";
  const [selectedTrainerId, setSelectedTrainerId] =
    useState<string>(ALL_TRAINERS_ID);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const rangePreset = detectPreset(fromDate, toDate);
  const bucket = bucketForPreset(rangePreset);

  const membersQuery = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    enabled: isStaff,
  });

  const trainers = useMemo(
    () =>
      membersQuery.data?.filter((member) => member.role === "TRAINER") ?? [],
    [membersQuery.data],
  );

  const trainerId = isTrainer ? (user?.id ?? null) : selectedTrainerId;

  const selectedTrainer =
    trainerId === ALL_TRAINERS_ID
      ? null
      : (trainers.find((trainer) => trainer.id === trainerId) ?? null);

  const analyticsQuery = useQuery({
    queryKey: [
      "billing",
      "trainer-analytics",
      trainerId,
      studioId,
      fromDate,
      toDate,
      bucket,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ studioId, bucket });
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
    const today = formatDateInput(new Date());
    if (id === "all") {
      setFromDate("");
      setToDate("");
      return;
    }
    if (id === "month") {
      setFromDate(startOfMonthInput());
      setToDate(today);
      return;
    }
    if (id === "7d") {
      setFromDate(daysAgoInput(7));
      setToDate(today);
      return;
    }
    if (id === "30d") {
      setFromDate(daysAgoInput(30));
      setToDate(today);
      return;
    }
    if (id === "3m") {
      setFromDate(monthsAgoInput(3));
      setToDate(today);
      return;
    }
    if (id === "1y") {
      setFromDate(monthsAgoInput(12));
      setToDate(today);
      return;
    }
    if (id === "custom" && !fromDate && !toDate) {
      setFromDate(startOfMonthInput());
      setToDate(today);
    }
  }

  async function refresh() {
    await Promise.all([
      isStaff ? membersQuery.refetch() : Promise.resolve(),
      trainerId ? analyticsQuery.refetch() : Promise.resolve(),
    ]);
  }

  const data = analyticsQuery.data;

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((point) => ({
        ...point,
        label: formatSeriesLabel(point.start, bucket),
      })),
    [data?.series, bucket],
  );

  const methodTotal =
    (data?.byPaymentMethod.CASH.amount ?? 0) +
    (data?.byPaymentMethod.UPI_MANUAL.amount ?? 0) +
    (data?.byPaymentMethod.RAZORPAY.amount ?? 0);

  const maxBatchCollected = Math.max(
    1,
    ...(data?.byBatch.map((batch) => batch.collected) ?? [1]),
  );

  function exportCsv() {
    if (!data) {
      return;
    }
    downloadCsv(`payments-${trainerId ?? "studio"}.csv`, [
      ["Metric", "Value"],
      ["Net collected", String(data.totals.netCollected)],
      ["Collected", String(data.totals.collected)],
      ["Pending", String(data.totals.pending)],
      ["Overdue", String(data.totals.overdue)],
      ["Refunded", String(data.totals.refunded)],
      ["Platform fees", String(data.totals.platformFees)],
      [],
      ["Student", "Batch", "Status", "Due", "Amount"],
      ...data.pendingPayments.map((row) => [
        row.studentName,
        row.batchName ?? "",
        row.status,
        row.dueDate ?? "",
        String(row.amount),
      ]),
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

  const deltaPct = data?.comparison.netCollectedDeltaPct ?? null;
  const deltaTone = deltaPct == null ? "flat" : deltaPct >= 0 ? "up" : "down";

  return (
    <Screen
      title="Payments"
      subtitle={
        isTrainer
          ? "Money in, outstanding balances, and batch performance."
          : "Studio payment dashboard by trainer."
      }
    >
      <PullToRefresh onRefresh={refresh}>
        <div className={styles.root}>
          <div className={styles.filterBar}>
            {isStaff ? (
              membersQuery.isLoading ? (
                <SkeletonBlock height="2.5rem" className={styles.filterField} />
              ) : (
                <div className={styles.filterField}>
                  <Select
                    label="Trainer"
                    placeholder="Select a trainer"
                    selectedKey={trainerId}
                    onSelectionChange={(key) =>
                      setSelectedTrainerId(String(key))
                    }
                  >
                    <SelectTrigger>
                      <span className={styles.trainerSelectValue}>
                        {trainerId === ALL_TRAINERS_ID ? (
                          <Avatar
                            size="sm"
                            className={styles.trainerSelectAvatar}
                          >
                            <AvatarFallback>
                              <Icon name="users" />
                            </AvatarFallback>
                          </Avatar>
                        ) : selectedTrainer ? (
                          <Avatar
                            size="sm"
                            className={styles.trainerSelectAvatar}
                          >
                            {selectedTrainer.photoUrl ? (
                              <AvatarImage
                                src={selectedTrainer.photoUrl}
                                alt={selectedTrainer.name}
                              />
                            ) : null}
                            <AvatarFallback>
                              {selectedTrainer.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id={ALL_TRAINERS_ID} textValue="All trainers">
                        <span className={styles.trainerOption}>
                          <Avatar
                            size="sm"
                            className={styles.trainerSelectAvatar}
                          >
                            <AvatarFallback>
                              <Icon name="users" />
                            </AvatarFallback>
                          </Avatar>
                          All trainers
                        </span>
                      </SelectItem>
                      {trainers.map((trainer) => (
                        <SelectItem
                          key={trainer.id}
                          id={trainer.id}
                          textValue={trainer.name}
                        >
                          <span className={styles.trainerOption}>
                            <Avatar
                              size="sm"
                              className={styles.trainerSelectAvatar}
                            >
                              {trainer.photoUrl ? (
                                <AvatarImage
                                  src={trainer.photoUrl}
                                  alt={trainer.name}
                                />
                              ) : null}
                              <AvatarFallback>
                                {trainer.name.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {trainer.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            ) : null}

            <div className={styles.filterField}>
              <Select
                label="Period"
                selectedKey={rangePreset === "custom" ? "custom" : rangePreset}
                onSelectionChange={(key) => applyPreset(String(key))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.id} id={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles.filterActions}>
              {isStaff ? (
                <TouchButton
                  variant="default"
                  size="md"
                  isDisabled={!data}
                  onClick={exportCsv}
                >
                  Export
                </TouchButton>
              ) : null}
              <TouchButton
                variant="default"
                size="md"
                onClick={() => void refresh()}
              >
                Refresh
              </TouchButton>
            </div>

            {rangePreset === "custom" ? (
              <div className={styles.customDates}>
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
            ) : null}
          </div>

          {trainerId && analyticsQuery.isLoading ? (
            <>
              <SkeletonBlock height="9rem" radius="var(--radius-xl)" />
              <div className={styles.kpiGrid}>
                <SkeletonBlock height="5.25rem" radius="var(--radius-xl)" />
                <SkeletonBlock height="5.25rem" radius="var(--radius-xl)" />
                <SkeletonBlock height="5.25rem" radius="var(--radius-xl)" />
                <SkeletonBlock height="5.25rem" radius="var(--radius-xl)" />
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

          {data ? (
            <>
              <section className={styles.hero} aria-label="Net earnings">
                <span className={styles.heroLabel}>Net earnings</span>
                <strong className={styles.heroValue}>
                  {formatInr(data.totals.netCollected)}
                </strong>
                <span className={styles.heroDelta} data-tone={deltaTone}>
                  {formatDeltaPct(deltaPct)}
                </span>
                <div className={styles.heroSecondary}>
                  <span>
                    Collected{" "}
                    <strong>{formatInr(data.totals.collected)}</strong>
                  </span>
                  <span>
                    Pending <strong>{formatInr(data.totals.pending)}</strong>
                  </span>
                  <span>
                    Refunded <strong>{formatInr(data.totals.refunded)}</strong>
                  </span>
                  <span>
                    Fees <strong>{formatInr(data.totals.platformFees)}</strong>
                  </span>
                </div>
              </section>

              <div className={styles.kpiGrid}>
                <KpiCard
                  icon="check"
                  tone="success"
                  label="Collected"
                  description="Money received from paid invoices, after any refunds."
                  value={formatInr(data.totals.collected)}
                  hint={formatDeltaPct(data.comparison.collectedDeltaPct)}
                />
                <KpiCard
                  icon="clock"
                  tone="warning"
                  label="Pending"
                  description="Unpaid invoices that are not past their due date yet."
                  value={formatInr(data.totals.pending)}
                  hint={`${data.byStatus.PENDING.count} invoices`}
                />
                <KpiCard
                  icon="alert-triangle"
                  tone="danger"
                  label="Overdue"
                  description="Unpaid invoices that are past their due date."
                  value={formatInr(data.totals.overdue)}
                  hint={
                    data.byStatus.OVERDUE.count === 0
                      ? "All clear"
                      : `${data.byStatus.OVERDUE.count} invoices`
                  }
                />
                <KpiCard
                  icon="refresh"
                  tone="warning"
                  label="Refunded"
                  description="Full and partial refunds issued on paid invoices."
                  value={formatInr(data.totals.refunded)}
                  hint={
                    data.byStatus.REFUNDED.count === 0 &&
                    data.totals.refunded === 0
                      ? "No refunds"
                      : `${data.byStatus.REFUNDED.count} full · partial included`
                  }
                />
              </div>

              <section className={styles.panel} aria-label="Revenue trend">
                <div className={styles.panelHead}>
                  <p className={styles.panelTitle}>Revenue trend</p>
                  <div className={styles.panelChartSwitcher}>
                    <ToggleButtonGroup
                      aria-label="Chart type"
                      selectionMode="single"
                      selectedKeys={[chartType]}
                      disallowEmptySelection
                      size="sm"
                      isIconOnly
                      onSelectionChange={(keys) => {
                        const next = String([...keys][0] ?? "");
                        if (
                          next === "bar" ||
                          next === "area" ||
                          next === "line"
                        ) {
                          setChartType(next);
                        }
                      }}
                    >
                      {CHART_TYPES.map((type) => (
                        <ToggleButton
                          key={type.id}
                          id={type.id}
                          aria-label={type.label}
                        >
                          <Icon name={type.icon} />
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <EmptyState
                    title="No revenue yet"
                    description="Paid invoices in this range will appear here."
                  />
                ) : (
                  <RevenueChart data={chartData} type={chartType} />
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>Batch performance</p>
                {data.byBatch.length === 0 ? (
                  <EmptyState
                    title="No batches"
                    description="Assign batches to this trainer to see performance."
                  />
                ) : (
                  <ul className={styles.batchList}>
                    {[...data.byBatch]
                      .sort((a, b) => b.collected - a.collected)
                      .map((batch) => (
                        <li key={batch.batchId}>
                          <button
                            type="button"
                            className={styles.batchRow}
                            onClick={() =>
                              void navigate({
                                to: "/app/batches/$id",
                                params: { id: batch.batchId },
                              })
                            }
                          >
                            <div className={styles.batchTop}>
                              <span className={styles.batchName}>
                                {batch.batchName}
                              </span>
                              <span className={styles.batchAmount}>
                                {formatCompactInr(batch.collected)}
                              </span>
                            </div>
                            <ProgressBar
                              value={Math.round(
                                (batch.collected / maxBatchCollected) * 100,
                              )}
                              aria-label={`${batch.batchName} collected share`}
                            >
                              <ProgressBarTrack>
                                <ProgressBarFill />
                              </ProgressBarTrack>
                            </ProgressBar>
                            <p className={styles.batchMeta}>
                              {batch.studentCount} students
                              {batch.pending > 0
                                ? ` · Pending ${formatInr(batch.pending)}`
                                : ""}
                              {batch.overdue > 0
                                ? ` · Overdue ${formatInr(batch.overdue)}`
                                : ""}
                              {batch.refunded > 0
                                ? ` · Refunded ${formatInr(batch.refunded)}`
                                : ""}
                            </p>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>Payment methods</p>
                <div className={styles.methodList}>
                  {(["CASH", "UPI_MANUAL", "RAZORPAY"] as const).map(
                    (method) => {
                      const entry = data.byPaymentMethod[method];
                      const pct =
                        methodTotal > 0
                          ? Math.round((entry.amount / methodTotal) * 100)
                          : 0;
                      return (
                        <div key={method} className={styles.methodRow}>
                          <div className={styles.methodMeta}>
                            <span className={styles.methodName}>
                              {METHOD_LABELS[method]} · {pct}%
                            </span>
                            <span className={styles.methodAmount}>
                              {formatInr(entry.amount)} · {entry.count}
                            </span>
                          </div>
                          <div
                            className={styles.methodBar}
                            data-method={method}
                          >
                            <ProgressBar
                              value={pct}
                              aria-label={`${METHOD_LABELS[method]} share`}
                            >
                              <ProgressBarTrack>
                                <ProgressBarFill />
                              </ProgressBarTrack>
                            </ProgressBar>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

function RevenueChartAxes() {
  return (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        minTickGap={24}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={48}
        tickFormatter={(value: number) => formatCompactInr(value)}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            formatter={(value) => formatInr(Number(value ?? 0))}
          />
        }
      />
    </>
  );
}

function RevenueChart({
  data,
  type,
}: {
  data: Array<{
    label: string;
    netCollected: number;
    collected: number;
    invoiceCount: number;
  }>;
  type: ChartType;
}) {
  const chart =
    type === "bar" ? (
      <BarChart data={data} accessibilityLayer>
        <RevenueChartAxes />
        <Bar
          dataKey="netCollected"
          fill="var(--color-netCollected)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    ) : type === "area" ? (
      <AreaChart data={data} accessibilityLayer>
        <RevenueChartAxes />
        <Area
          type="monotone"
          dataKey="netCollected"
          stroke="var(--color-netCollected)"
          fill="var(--color-netCollected)"
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </AreaChart>
    ) : (
      <LineChart data={data} accessibilityLayer>
        <RevenueChartAxes />
        <Line
          type="monotone"
          dataKey="netCollected"
          stroke="var(--color-netCollected)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    );

  return (
    <ChartContainer
      config={revenueChartConfig}
      className={styles.chart}
      aria-label="Revenue trend chart"
    >
      {chart}
    </ChartContainer>
  );
}

function KpiCard({
  icon,
  label,
  description,
  value,
  hint,
  tone,
}: {
  icon: IconName;
  label: string;
  description: string;
  value: string;
  hint: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>
        <span className={styles.kpiIcon} data-tone={tone} aria-hidden>
          <Icon name={icon} />
        </span>
        {label}
        <Tooltip
          delay={200}
          touchBehavior="toggle"
          className={styles.kpiInfoWrap}
        >
          <button
            type="button"
            className={styles.kpiInfo}
            aria-label={`What is ${label}?`}
          >
            <Icon name="help-circle" />
          </button>
          <TooltipContent portal placement="top" className={styles.kpiTooltip}>
            {description}
          </TooltipContent>
        </Tooltip>
      </span>
      <strong className={styles.kpiValue}>{value}</strong>
      <span className={styles.kpiHint}>{hint}</span>
    </div>
  );
}

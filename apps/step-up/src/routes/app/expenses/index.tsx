import {
  Area,
  AreaChart,
  CartesianGrid,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ExpenseTabs } from "@/modules/expenses/expense-tabs";
import styles from "@/modules/expenses/expenses.module.scss";
import {
  type DashboardData,
  formatPrice,
  monthStartInputValue,
  todayInputValue,
} from "@/modules/expenses/types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

const chartConfig = {
  amount: {
    label: "Spend",
    color: "var(--color-danger)",
  },
} satisfies ChartConfig;

type Bucket = "day" | "week" | "month";

function formatSeriesLabel(start: string, bucket: Bucket) {
  const date = new Date(start);
  if (bucket === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  if (bucket === "week") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function deltaTone(pct: number | null) {
  if (pct === null) return "flat" as const;
  if (pct > 0) return "up" as const;
  if (pct < 0) return "down" as const;
  return "flat" as const;
}

function formatDelta(pct: number | null) {
  if (pct === null) return "No prior data";
  const abs = Math.abs(pct);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${abs.toFixed(0)}% vs prior`;
}

export const Route = createFileRoute("/app/expenses/")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: ExpensesDashboardPage,
});

function ExpensesDashboardPage() {
  const api = useApi();
  const studioId = useStudioId();
  const [from, setFrom] = useState(monthStartInputValue());
  const to = todayInputValue();
  const [bucket, setBucket] = useState<Bucket>("day");

  const dashboardQuery = useQuery({
    queryKey: ["expense-dashboard", studioId, from, to, bucket],
    queryFn: () =>
      api.get<DashboardData>(
        `/expenses/studio/${studioId}/dashboard?from=${from}&to=${to}&bucket=${bucket}`,
      ),
  });

  const data = dashboardQuery.data;
  const chartBucket = data?.trend.bucket ?? "day";
  const series = useMemo(
    () =>
      (data?.trend.series ?? []).map((point) => ({
        start: point.start,
        label: formatSeriesLabel(point.start, chartBucket),
        amount: point.amount,
      })),
    [data, chartBucket],
  );

  return (
    <Screen
      title="Expenses"
      subtitle="Track studio spending, categories, and receipts."
      wide
    >
      <ExpenseTabs />
      <PullToRefresh onRefresh={() => dashboardQuery.refetch()}>
        <div className={styles.root}>
          {dashboardQuery.isError ? (
            <ErrorState
              description={
                dashboardQuery.error instanceof Error
                  ? dashboardQuery.error.message
                  : "Could not load the expense dashboard."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => dashboardQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {dashboardQuery.isLoading || !data ? (
            <div className={styles.root}>
              <SkeletonBlock height="1.75rem" width="70%" />
              <div className={styles.summaryGrid}>
                <SkeletonBlock height="5.5rem" />
                <SkeletonBlock height="5.5rem" />
                <SkeletonBlock height="5.5rem" />
                <SkeletonBlock height="5.5rem" />
              </div>
              <SkeletonBlock height="16rem" />
            </div>
          ) : (
            <>
              <div className={styles.filterBar}>
                <div className={styles.filterField}>
                  <Select
                    label="From"
                    selectedKey={from}
                    onSelectionChange={(key) =>
                      setFrom(String(key ?? todayInputValue()))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 6, 11].map((offset) => (
                        <SelectItem
                          key={offset}
                          id={monthStartInputValue(offset)}
                          textValue={monthStartInputValue(offset)}
                        >
                          {monthStartInputValue(offset)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={styles.filterField}>
                  <Select
                    label="Bucket"
                    selectedKey={bucket}
                    onSelectionChange={(key) =>
                      setBucket(String(key ?? "day") as Bucket)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem id="day" textValue="Daily">
                        Daily
                      </SelectItem>
                      <SelectItem id="week" textValue="Weekly">
                        Weekly
                      </SelectItem>
                      <SelectItem id="month" textValue="Monthly">
                        Monthly
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>This month</span>
                  <span className={styles.summaryValue}>
                    {formatPrice(data.summaryCards.thisMonth)}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>This year</span>
                  <span className={styles.summaryValue}>
                    {formatPrice(data.summaryCards.thisYear)}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>
                    vs last month · {formatPrice(data.summaryCards.prevMonth)}
                  </span>
                  <span className={styles.summaryValue}>
                    {formatPrice(data.summaryCards.thisMonth)}
                  </span>
                  <span
                    className={styles.summaryDelta}
                    data-tone={deltaTone(data.summaryCards.prevMonthDeltaPct)}
                  >
                    {formatDelta(data.summaryCards.prevMonthDeltaPct)}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Monthly average</span>
                  <span className={styles.summaryValue}>
                    {formatPrice(data.summaryCards.averageMonthly)}
                  </span>
                  {data.summaryCards.largestCategory ? (
                    <span className={styles.summaryLabel}>
                      Top: {data.summaryCards.largestCategory.categoryName}
                    </span>
                  ) : null}
                </div>
              </div>

              <section className={styles.panel} aria-label="Spending trend">
                <div className={styles.panelHead}>
                  <p className={styles.panelTitle}>Spending trend</p>
                  <span className={staff.rowMeta}>
                    {formatPrice(data.trend.comparison.amount)} previous period
                  </span>
                </div>
                {series.length === 0 ? (
                  <EmptyState
                    title="No spending yet"
                    description="Expenses in this range will appear here."
                  />
                ) : (
                  <div className={styles.chartWrap}>
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto h-[14rem] w-full"
                    >
                      <AreaChart data={series} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={16}
                        />
                        <YAxis
                          width={52}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value: number) => formatPrice(value)}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Area
                          dataKey="amount"
                          type="monotone"
                          fill="var(--color-danger)"
                          fillOpacity={0.2}
                          stroke="var(--color-danger)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>By category</p>
                {data.byCategory.length === 0 ? (
                  <EmptyState
                    title="No categories"
                    description="Expenses grouped by category will appear here."
                  />
                ) : (
                  <div className={styles.categoryList}>
                    {data.byCategory.map((category) => (
                      <div
                        key={category.categoryId}
                        className={styles.categoryRow}
                      >
                        <div className={styles.categoryBody}>
                          <span className={styles.categoryName}>
                            {category.categoryName}
                          </span>
                          <ProgressBar
                            value={Math.round(category.percentage)}
                            aria-label={`${category.categoryName} share`}
                          >
                            <ProgressBarTrack>
                              <ProgressBarFill />
                            </ProgressBarTrack>
                          </ProgressBar>
                          <span className={styles.categoryMeta}>
                            {category.percentage.toFixed(0)}% of spend
                          </span>
                        </div>
                        <span className={styles.expenseAmount}>
                          {formatPrice(category.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>Recent expenses</p>
                {data.recent.length === 0 ? (
                  <EmptyState
                    title="No expenses recorded"
                    description="Record your first expense to see it here."
                  />
                ) : (
                  <div className={styles.categoryList}>
                    {data.recent.map((expense) => (
                      <Link
                        key={expense.id}
                        to="/app/expenses/list"
                        className={styles.expenseRow}
                        search={{ id: expense.id }}
                      >
                        <span className={styles.categoryBadge}>
                          <Icon name="file-text" />
                        </span>
                        <span className={styles.expenseBody}>
                          <span className={styles.expenseTitle}>
                            {expense.vendor ?? expense.category.name}
                          </span>
                          <span className={styles.expenseMeta}>
                            {expense.category.name} ·{" "}
                            {new Date(expense.expenseDate).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </span>
                        <span className={styles.expenseAmount}>
                          {formatPrice(expense.amount)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

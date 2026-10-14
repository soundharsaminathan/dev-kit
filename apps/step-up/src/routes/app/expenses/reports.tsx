import {
  Bar,
  BarChart,
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
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ExpenseTabs } from "@/modules/expenses/expense-tabs";
import styles from "@/modules/expenses/expenses.module.scss";
import {
  formatPrice,
  monthStartInputValue,
  type ReportsData,
  todayInputValue,
} from "@/modules/expenses/types";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

const chartConfig = {
  total: {
    label: "Spend",
    color: "var(--color-danger)",
  },
} satisfies ChartConfig;

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export const Route = createFileRoute("/app/expenses/reports")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: () => (
    <RequireStudioFeature feature="expenses">
      <ExpensesReportsPage />
    </RequireStudioFeature>
  ),
});

function ExpensesReportsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const [from, setFrom] = useState(monthStartInputValue(-5));
  const [to, setTo] = useState(todayInputValue());

  const reportsQuery = useQuery({
    queryKey: ["expense-reports", studioId, from, to],
    queryFn: () =>
      api.get<ReportsData>(
        `/expenses/studio/${studioId}/reports?from=${from}&to=${to}`,
      ),
  });

  const data = reportsQuery.data;

  return (
    <Screen
      title="Expense reports"
      subtitle="Monthly totals, category and vendor breakdowns."
      wide
    >
      <ExpenseTabs />
      <PullToRefresh onRefresh={() => reportsQuery.refetch()}>
        <div className={styles.root}>
          <div className={styles.filterBar}>
            <div className={styles.filterField}>
              <FormInput
                label="From"
                type="date"
                value={from}
                onChange={setFrom}
              />
            </div>
            <div className={styles.filterField}>
              <FormInput label="To" type="date" value={to} onChange={setTo} />
            </div>
            <div className={styles.filterField}>
              <TouchButton
                variant="default"
                onClick={() => {
                  setFrom(monthStartInputValue(-5));
                  setTo(todayInputValue());
                }}
              >
                Last 6 months
              </TouchButton>
            </div>
          </div>

          {reportsQuery.isError ? (
            <ErrorState
              description={
                reportsQuery.error instanceof Error
                  ? reportsQuery.error.message
                  : "Could not load the report."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => reportsQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {reportsQuery.isLoading || !data ? (
            <div className={styles.root}>
              <SkeletonBlock height="6rem" />
              <SkeletonBlock height="16rem" />
              <SkeletonBlock height="14rem" />
            </div>
          ) : (
            <>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Total spend</span>
                  <span className={styles.summaryValue}>
                    {formatPrice(data.totals.amount)}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>Transactions</span>
                  <span className={styles.summaryValue}>
                    {data.totals.count}
                  </span>
                </div>
              </div>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>Monthly totals</p>
                {data.monthly.length === 0 ? (
                  <EmptyState
                    title="No expenses in range"
                    description="Pick a wider date range to see monthly totals."
                  />
                ) : (
                  <div className={styles.chartWrap}>
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto h-[14rem] w-full"
                    >
                      <BarChart
                        data={data.monthly}
                        margin={{ left: 0, right: 8 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={formatMonthLabel}
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
                        <Bar
                          dataKey="total"
                          fill="var(--color-danger)"
                          radius={6}
                        />
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>By category</p>
                {data.byCategory.length === 0 ? (
                  <EmptyState title="No categories" />
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
                            {category.count} expense
                            {category.count === 1 ? "" : "s"} · avg{" "}
                            {formatPrice(category.average)}
                          </span>
                        </div>
                        <span className={styles.expenseAmount}>
                          {formatPrice(category.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <p className={styles.panelTitle}>By vendor</p>
                {data.byVendor.length === 0 ? (
                  <EmptyState
                    title="No vendors"
                    description="Expenses without a vendor are not listed here."
                  />
                ) : (
                  <div className={styles.categoryList}>
                    {data.byVendor.map((vendor) => (
                      <div key={vendor.vendor} className={styles.categoryRow}>
                        <div className={styles.categoryBody}>
                          <span className={styles.categoryName}>
                            {vendor.vendor}
                          </span>
                          <span className={styles.categoryMeta}>
                            {vendor.count} expense
                            {vendor.count === 1 ? "" : "s"} · avg{" "}
                            {formatPrice(vendor.average)}
                          </span>
                        </div>
                        <span className={styles.expenseAmount}>
                          {formatPrice(vendor.total)}
                        </span>
                      </div>
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

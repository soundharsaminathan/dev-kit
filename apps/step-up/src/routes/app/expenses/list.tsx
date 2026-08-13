import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ExpenseDetailSheet } from "@/modules/expenses/expense-detail-sheet";
import { ExpenseFormSheet } from "@/modules/expenses/expense-form-sheet";
import { ExpenseTabs } from "@/modules/expenses/expense-tabs";
import styles from "@/modules/expenses/expenses.module.scss";
import {
  type Expense,
  type ExpenseCategory,
  type ExpenseListResult,
  type ExpensePaymentMethod,
  formatDateOnly,
  formatPrice,
  PAYMENT_METHOD_OPTIONS,
} from "@/modules/expenses/types";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/app/expenses/list")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: ExpensesListPage,
});

function ExpensesListPage() {
  const api = useApi();
  const studioId = useStudioId();
  const searchParams = Route.useSearch();

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<ExpensePaymentMethod | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (searchParams.id) {
      setSelectedId(searchParams.id);
    }
  }, [searchParams.id]);

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories", studioId],
    queryFn: () =>
      api.get<ExpenseCategory[]>(`/expense-categories/studio/${studioId}`),
  });

  const expensesQuery = useQuery({
    queryKey: [
      "expenses",
      studioId,
      searchDebounced,
      categoryId,
      paymentMethod,
      page,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort: "date",
        order: "desc",
      });
      if (searchDebounced) params.set("search", searchDebounced);
      if (categoryId) params.set("categoryId", categoryId);
      if (paymentMethod) params.set("paymentMethod", paymentMethod);
      return api.get<ExpenseListResult>(
        `/expenses/studio/${studioId}?${params.toString()}`,
      );
    },
  });

  const selectedExpense =
    expensesQuery.data?.items.find((item) => item.id === selectedId) ?? null;

  const categories = categoriesQuery.data ?? [];
  const total = expensesQuery.data?.total ?? 0;
  const hasMore = expensesQuery.data?.hasMore ?? false;

  function openDetail(expenseId: string) {
    setSelectedId(expenseId);
  }

  function refresh() {
    return Promise.all([expensesQuery.refetch(), categoriesQuery.refetch()]);
  }

  return (
    <Screen
      title="All expenses"
      subtitle="Search, filter, and review every recorded expense."
      actions={
        <TouchButton
          variant="primary"
          size="md"
          data-testid="add-expense"
          onClick={() => setCreating(true)}
        >
          Add expense
        </TouchButton>
      }
      wide
    >
      <ExpenseTabs />
      <PullToRefresh onRefresh={refresh}>
        <div className={styles.root}>
          <div className={styles.filterBar}>
            <FormInput
              className={styles.searchField}
              label="Search"
              value={search}
              onChange={setSearch}
              placeholder="Vendor or description"
            />
            <div className={styles.filterField}>
              <Select
                label="Category"
                placeholder="All"
                selectedKey={categoryId}
                onSelectionChange={(key) => {
                  setCategoryId(key == null ? null : String(key));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      id={category.id}
                      textValue={category.name}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.filterField}>
              <Select
                label="Payment method"
                placeholder="All"
                selectedKey={paymentMethod}
                onSelectionChange={(key) => {
                  setPaymentMethod(
                    key == null ? null : (String(key) as ExpensePaymentMethod),
                  );
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      id={option.value}
                      textValue={option.label}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {expensesQuery.isError ? (
            <ErrorState
              description={
                expensesQuery.error instanceof Error
                  ? expensesQuery.error.message
                  : "Could not load expenses."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => expensesQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {expensesQuery.isLoading ? <SkeletonRowList count={6} /> : null}

          {expensesQuery.data && expensesQuery.data.items.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description={
                searchDebounced || categoryId || paymentMethod
                  ? "Try clearing filters or searching for something else."
                  : "Record your first expense to get started."
              }
              action={
                !searchDebounced && !categoryId && !paymentMethod ? (
                  <TouchButton
                    variant="primary"
                    onClick={() => setCreating(true)}
                  >
                    Record expense
                  </TouchButton>
                ) : undefined
              }
            />
          ) : null}

          {expensesQuery.data && expensesQuery.data.items.length > 0 ? (
            <div className={styles.categoryList}>
              {expensesQuery.data.items.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  className={styles.expenseRow}
                  onClick={() => openDetail(expense.id)}
                  data-testid={`expense-row-${expense.id}`}
                >
                  <span className={styles.categoryBadge}>
                    <Icon name="file-text" />
                  </span>
                  <span className={styles.expenseBody}>
                    <span className={styles.expenseTitle}>
                      {expense.vendor ?? expense.category.name}
                    </span>
                    <span className={styles.expenseMeta}>
                      {expense.category.name}
                      {expense.paymentMethod ? " · " : ""}
                      {expense.paymentMethod ?? ""} ·{" "}
                      {formatDateOnly(expense.expenseDate)}
                    </span>
                  </span>
                  <span className={styles.expenseAmount}>
                    {formatPrice(expense.amount)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {hasMore ? (
            <div className={styles.loadMore}>
              <TouchButton
                variant="default"
                isPending={expensesQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Load more
              </TouchButton>
            </div>
          ) : null}

          {expensesQuery.data && total > 0 ? (
            <p className={styles.detailLabel}>
              {total} expense{total === 1 ? "" : "s"} found
            </p>
          ) : null}
        </div>
      </PullToRefresh>

      <ExpenseDetailSheet
        isOpen={selectedExpense !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        studioId={studioId}
        expense={selectedExpense}
        onEdit={(expense) => setEditing(expense)}
      />

      <ExpenseFormSheet
        isOpen={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        studioId={studioId}
        categories={categories}
        expense={editing}
        onSaved={() => {
          void refresh();
        }}
      />
    </Screen>
  );
}

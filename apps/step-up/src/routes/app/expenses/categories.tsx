import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ExpenseTabs } from "@/modules/expenses/expense-tabs";
import styles from "@/modules/expenses/expenses.module.scss";
import { RecurringExpenseFormSheet } from "@/modules/expenses/recurring-expense-form-sheet";
import {
  type ExpenseCategory,
  FREQUENCY_LABELS,
  formatDateOnly,
  formatPrice,
  type RecurringExpense,
} from "@/modules/expenses/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

export const Route = createFileRoute("/app/expenses/categories")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: () => (
    <RequireStudioFeature feature="expenses">
      <ExpensesCategoriesPage />
    </RequireStudioFeature>
  ),
});

function CategoryFormSheet({
  isOpen,
  onOpenChange,
  studioId,
  category,
  onSaved,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  category: ExpenseCategory | null;
  onSaved?: () => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("CategoryFormSheet");
  const [name, setName] = useState(category?.name ?? "");

  const isEdit = category !== null;

  useEffect(() => {
    if (isOpen) {
      setName(category?.name ?? "");
    }
  }, [isOpen, category]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Enter a category name.");
      }
      const body = { name: trimmed };
      if (category) {
        return api.patch<ExpenseCategory>(
          `/expense-categories/${category.id}`,
          body,
        );
      }
      return api.post<ExpenseCategory>("/expense-categories", {
        ...body,
        studioId,
      });
    },
    onSuccess: async () => {
      onOpenChange(false);
      setName("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expense-categories", studioId],
        }),
        queryClient.invalidateQueries({ queryKey: ["expenses", studioId] }),
        queryClient.invalidateQueries({
          queryKey: ["expense-dashboard", studioId],
        }),
      ]);
      toast({
        title: isEdit ? "Category updated" : "Category added",
        description: isEdit
          ? "The expense category was updated."
          : "The expense category is ready to use.",
        variant: "success",
      });
      onSaved?.();
    },
  });

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !save.isPending) {
          onOpenChange(false);
        }
      }}
      title={isEdit ? "Edit category" : "Add category"}
    >
      <div className={styles.sheetStack}>
        <FormInput
          label="Name"
          value={name}
          onChange={setName}
          placeholder="e.g. Rent, Utilities, Props"
          autoFocus
          data-testid="category-name-input"
        />

        {save.isError ? (
          <ErrorState
            description={
              save.error instanceof Error
                ? save.error.message
                : "The category could not be saved."
            }
          />
        ) : null}

        <div className={styles.sheetActions}>
          <TouchButton
            variant="default"
            fullWidth
            isDisabled={save.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </TouchButton>
          <TouchButton
            variant="primary"
            fullWidth
            isPending={save.isPending}
            data-testid="confirm-save-category"
            onClick={() => save.mutate()}
          >
            {isEdit ? "Save changes" : "Add category"}
          </TouchButton>
        </div>
      </div>
    </AppSheet>
  );
}

function ExpensesCategoriesPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ExpensesCategoriesPage");

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<ExpenseCategory | null>(null);
  const [inUseCategory, setInUseCategory] = useState<ExpenseCategory | null>(
    null,
  );
  const [creatingRecurring, setCreatingRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringExpense | null>(null);
  const [deletingRecurring, setDeletingRecurring] =
    useState<RecurringExpense | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories", studioId],
    queryFn: () =>
      api.get<ExpenseCategory[]>(`/expense-categories/studio/${studioId}`),
  });

  const recurringQuery = useQuery({
    queryKey: ["recurring-expenses", studioId],
    queryFn: () =>
      api.get<RecurringExpense[]>(`/recurring-expenses/studio/${studioId}`),
  });

  const deleteCategory = useMutation({
    mutationFn: () => api.delete(`/expense-categories/${deletingCategory?.id}`),
    onSuccess: async () => {
      setDeletingCategory(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expense-categories", studioId],
        }),
        queryClient.invalidateQueries({ queryKey: ["expenses", studioId] }),
        queryClient.invalidateQueries({
          queryKey: ["expense-dashboard", studioId],
        }),
      ]);
      toast({
        title: "Category deleted",
        description: "The category was removed.",
        variant: "success",
      });
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: () =>
      api.delete(`/recurring-expenses/${deletingRecurring?.id}`),
    onSuccess: async () => {
      setDeletingRecurring(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["recurring-expenses", studioId],
        }),
        queryClient.invalidateQueries({ queryKey: ["expenses", studioId] }),
      ]);
      toast({
        title: "Recurring expense deleted",
        description: "No more automatic expenses will be created.",
        variant: "success",
      });
    },
  });

  const categories = categoriesQuery.data ?? [];
  const recurring = recurringQuery.data ?? [];

  function refresh() {
    return Promise.all([categoriesQuery.refetch(), recurringQuery.refetch()]);
  }

  return (
    <Screen
      title="Categories"
      subtitle="Organize spending and manage automatic expenses."
      actions={
        <TouchButton
          variant="primary"
          size="md"
          onClick={() => setCreatingCategory(true)}
        >
          Add category
        </TouchButton>
      }
      wide
    >
      <ExpenseTabs />
      <PullToRefresh onRefresh={refresh}>
        <div className={styles.root}>
          {categoriesQuery.isError ? (
            <ErrorState
              description={
                categoriesQuery.error instanceof Error
                  ? categoriesQuery.error.message
                  : "Could not load categories."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => categoriesQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {categoriesQuery.isLoading ? <SkeletonBlock height="12rem" /> : null}

          {!categoriesQuery.isLoading &&
          categoriesQuery.data &&
          categories.length === 0 ? (
            <EmptyState
              title="No categories yet"
              description="Add a category so expenses can be grouped and reported."
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => setCreatingCategory(true)}
                >
                  Add category
                </TouchButton>
              }
            />
          ) : null}

          {categories.length > 0 ? (
            <section className={styles.panel}>
              <p className={styles.panelTitle}>Expense categories</p>
              <div className={styles.categoryList}>
                {categories.map((category) => (
                  <div key={category.id} className={styles.categoryRow}>
                    <span className={styles.categoryBadge}>
                      <Icon name="tag" />
                    </span>
                    <div className={styles.categoryBody}>
                      <span className={styles.categoryName}>
                        {category.name}
                      </span>
                      <span className={styles.categoryMeta}>
                        {category.isDefault
                          ? "Default · "
                          : `${category._count?.expenses ?? 0} expense${
                              category._count?.expenses === 1 ? "" : "s"
                            } · `}
                        added{" "}
                        {new Date(category.createdAt).toLocaleDateString(
                          undefined,
                          { month: "short", year: "numeric" },
                        )}
                      </span>
                    </div>
                    <div className={styles.categoryActions}>
                      <TouchButton
                        size="sm"
                        variant="quiet"
                        data-testid={`edit-category-${category.id}`}
                        onClick={() => setEditingCategory(category)}
                      >
                        Edit
                      </TouchButton>
                      {!category.isDefault ? (
                        <TouchButton
                          size="sm"
                          variant="quiet"
                          onClick={() => {
                            if ((category._count?.expenses ?? 0) > 0) {
                              setInUseCategory(category);
                            } else {
                              setDeletingCategory(category);
                            }
                          }}
                        >
                          Delete
                        </TouchButton>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {recurringQuery.isError ? (
            <ErrorState
              description={
                recurringQuery.error instanceof Error
                  ? recurringQuery.error.message
                  : "Could not load recurring expenses."
              }
            />
          ) : null}

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>Recurring expenses</p>
              <TouchButton
                size="sm"
                variant="default"
                onClick={() => setCreatingRecurring(true)}
              >
                Add
              </TouchButton>
            </div>
            {recurringQuery.isLoading ? <SkeletonBlock height="8rem" /> : null}
            {!recurringQuery.isLoading &&
            recurringQuery.data &&
            recurring.length === 0 ? (
              <EmptyState
                title="No recurring expenses"
                description="Rent, subscriptions, and payroll can be tracked automatically."
              />
            ) : null}
            {recurring.length > 0 ? (
              <div className={styles.categoryList}>
                {recurring.map((item) => (
                  <div key={item.id} className={styles.categoryRow}>
                    <span className={styles.categoryBadge}>
                      <Icon name="refresh" />
                    </span>
                    <div className={styles.categoryBody}>
                      <span className={styles.categoryName}>
                        {item.vendor ?? item.category.name}
                      </span>
                      <span className={styles.categoryMeta}>
                        {item.category.name} ·{" "}
                        {FREQUENCY_LABELS[item.frequency]} · next{" "}
                        {formatDateOnly(item.nextOccurrence)}
                      </span>
                    </div>
                    <span className={styles.expenseAmount}>
                      {formatPrice(item.amount)}
                    </span>
                    <div className={styles.categoryActions}>
                      <TouchButton
                        size="sm"
                        variant="quiet"
                        onClick={() => setEditingRecurring(item)}
                      >
                        Edit
                      </TouchButton>
                      <TouchButton
                        size="sm"
                        variant="quiet"
                        onClick={() => setDeletingRecurring(item)}
                      >
                        Delete
                      </TouchButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </PullToRefresh>

      <CategoryFormSheet
        key={editingCategory?.id ?? "new-category"}
        isOpen={creatingCategory || editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingCategory(false);
            setEditingCategory(null);
          }
        }}
        studioId={studioId}
        category={editingCategory}
        onSaved={() => {
          void categoriesQuery.refetch();
        }}
      />

      <AppSheet
        isOpen={deletingCategory !== null}
        onOpenChange={(open) => {
          if (!open && !deleteCategory.isPending) {
            setDeletingCategory(null);
          }
        }}
        title="Delete category"
      >
        <div className={styles.sheetStack}>
          <p className={styles.detailValue}>
            Delete “{deletingCategory?.name}”? Existing expenses keep their
            category name.
          </p>
          {deleteCategory.isError ? (
            <ErrorState
              description={
                deleteCategory.error instanceof Error
                  ? deleteCategory.error.message
                  : "The category could not be deleted."
              }
            />
          ) : null}
          <div className={styles.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteCategory.isPending}
              onClick={() => setDeletingCategory(null)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteCategory.isPending}
              data-testid="confirm-delete-category"
              onClick={() => deleteCategory.mutate()}
            >
              Delete category
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={inUseCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setInUseCategory(null);
          }
        }}
        title="Category already used"
      >
        <div className={styles.sheetStack}>
          <p className={styles.detailValue}>
            “{inUseCategory?.name}” has {inUseCategory?._count?.expenses ?? 0}{" "}
            expense
            {(inUseCategory?._count?.expenses ?? 0) === 1 ? "" : "s"} recorded,
            so it can’t be deleted. Delete or reassign those expenses before
            removing this category.
          </p>
          <div className={styles.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              onClick={() => setInUseCategory(null)}
            >
              Got it
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <RecurringExpenseFormSheet
        isOpen={creatingRecurring || editingRecurring !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingRecurring(false);
            setEditingRecurring(null);
          }
        }}
        studioId={studioId}
        categories={categories}
        recurringExpense={editingRecurring}
        onSaved={() => {
          void recurringQuery.refetch();
        }}
      />

      <AppSheet
        isOpen={deletingRecurring !== null}
        onOpenChange={(open) => {
          if (!open && !deleteRecurring.isPending) {
            setDeletingRecurring(null);
          }
        }}
        title="Delete recurring expense"
      >
        <div className={styles.sheetStack}>
          <p className={styles.detailValue}>
            Stop automatic expenses of{" "}
            {deletingRecurring ? formatPrice(deletingRecurring.amount) : ""}{" "}
            {deletingRecurring?.frequency.toLowerCase()}? Already-created
            expenses are kept.
          </p>
          {deleteRecurring.isError ? (
            <ErrorState
              description={
                deleteRecurring.error instanceof Error
                  ? deleteRecurring.error.message
                  : "The recurring expense could not be deleted."
              }
            />
          ) : null}
          <div className={styles.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteRecurring.isPending}
              onClick={() => setDeletingRecurring(null)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteRecurring.isPending}
              data-testid="confirm-delete-recurring-expense"
              onClick={() => deleteRecurring.mutate()}
            >
              Delete recurring expense
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </Screen>
  );
}

import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./expenses.module.scss";
import {
  type Expense,
  formatDateOnly,
  formatPrice,
  PAYMENT_METHOD_LABELS,
} from "./types";

type ExpenseDetailSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  expense: Expense | null;
  onEdit?: (expense: Expense) => void;
};

function receiptFileName(url: string | null, key: string | null) {
  if (!url && !key) return null;
  return key ? key.split("/").pop() : "Receipt";
}

export function ExpenseDetailSheet({
  isOpen,
  onOpenChange,
  studioId,
  expense,
  onEdit,
}: ExpenseDetailSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ExpenseDetailSheet");

  const deleteExpense = useMutation({
    mutationFn: () => api.delete(`/expenses/${expense?.id}`),
    onSuccess: async () => {
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses", studioId] }),
        queryClient.invalidateQueries({
          queryKey: ["expense-dashboard", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["expense-reports", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["expense-overview", studioId],
        }),
      ]);
      toast({
        title: "Expense deleted",
        description: "The expense was removed.",
        variant: "success",
      });
    },
  });

  const receiptName = expense
    ? receiptFileName(expense.receiptUrl, expense.receiptKey)
    : null;

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !deleteExpense.isPending) {
          onOpenChange(false);
        }
      }}
      title="Expense details"
    >
      {expense ? (
        <div className={styles.sheetStack}>
          <p className={styles.detailAmount}>{formatPrice(expense.amount)}</p>

          <div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Date</span>
              <span className={styles.detailValue}>
                {formatDateOnly(expense.expenseDate)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Category</span>
              <span className={styles.detailValue}>
                {expense.category.name}
              </span>
            </div>
            {expense.vendor ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Vendor</span>
                <span className={styles.detailValue}>{expense.vendor}</span>
              </div>
            ) : null}
            {expense.paymentMethod ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Payment method</span>
                <span className={styles.detailValue}>
                  {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                </span>
              </div>
            ) : null}
            {expense.description ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Description</span>
                <span className={styles.detailValue}>
                  {expense.description}
                </span>
              </div>
            ) : null}
            {expense.notes ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Notes</span>
                <span className={styles.detailValue}>{expense.notes}</span>
              </div>
            ) : null}
            {expense.recurringExpense ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Recurring</span>
                <span className={styles.detailValue}>
                  Generated from a{" "}
                  {expense.recurringExpense.frequency.toLowerCase()} expense
                </span>
              </div>
            ) : null}
            {receiptName ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Receipt</span>
                <a
                  className={styles.detailValue}
                  href={expense.receiptUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="file-text" /> {receiptName}
                </a>
              </div>
            ) : null}
          </div>

          {deleteExpense.isError ? (
            <ErrorState
              description={
                deleteExpense.error instanceof Error
                  ? deleteExpense.error.message
                  : "The expense could not be deleted."
              }
            />
          ) : null}

          <div className={styles.sheetActions}>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteExpense.isPending}
              data-testid="confirm-delete-expense"
              onClick={() => deleteExpense.mutate()}
            >
              Delete
            </TouchButton>
            <TouchButton
              variant="primary"
              fullWidth
              onClick={() => {
                onOpenChange(false);
                onEdit?.(expense);
              }}
            >
              Edit
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}

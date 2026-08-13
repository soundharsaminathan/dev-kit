import { FileTrigger } from "@dev-ui/components/file-trigger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./expenses.module.scss";
import {
  dateInputToApiValue,
  type Expense,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  formatPrice,
  PAYMENT_METHOD_OPTIONS,
  todayInputValue,
} from "./types";
import { uploadExpenseReceipt } from "./upload";

type ExpenseFormSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  categories: ExpenseCategory[];
  expense: Expense | null;
  onSaved?: () => void;
};

type FormState = {
  amount: string;
  expenseDate: string;
  categoryId: string;
  vendor: string;
  paymentMethod: ExpensePaymentMethod | "none";
  description: string;
  notes: string;
  receiptKey: string;
};

function initialState(expense: Expense | null): FormState {
  if (expense) {
    return {
      amount: String(expense.amount),
      expenseDate: expense.expenseDate.slice(0, 10),
      categoryId: expense.categoryId,
      vendor: expense.vendor ?? "",
      paymentMethod: expense.paymentMethod ?? "none",
      description: expense.description ?? "",
      notes: expense.notes ?? "",
      receiptKey: expense.receiptKey ?? "",
    };
  }
  return {
    amount: "",
    expenseDate: todayInputValue(),
    categoryId: "",
    vendor: "",
    paymentMethod: "none",
    description: "",
    notes: "",
    receiptKey: "",
  };
}

export function ExpenseFormSheet({
  isOpen,
  onOpenChange,
  studioId,
  categories,
  expense,
  onSaved,
}: ExpenseFormSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ExpenseFormSheet");
  const [form, setForm] = useState<FormState>(() => initialState(expense));
  const [receiptName, setReceiptName] = useState(
    expense?.receiptKey ? "Uploaded receipt" : "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialState(expense));
      setReceiptName(expense?.receiptKey ? "Uploaded receipt" : "");
      setUploadError(null);
    }
  }, [isOpen, expense]);

  const isEdit = expense !== null;

  const save = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }
      if (!form.expenseDate) {
        throw new Error("Choose an expense date.");
      }
      if (!form.categoryId) {
        throw new Error("Choose a category.");
      }
      const body = {
        amount,
        expenseDate: dateInputToApiValue(form.expenseDate),
        categoryId: form.categoryId,
        vendor: form.vendor.trim() || null,
        paymentMethod:
          form.paymentMethod === "none" ? null : form.paymentMethod,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        receiptKey: form.receiptKey || null,
      };
      if (isEdit) {
        return api.patch<Expense>(`/expenses/${expense.id}`, body);
      }
      return api.post<Expense>("/expenses", { ...body, studioId });
    },
    onSuccess: async () => {
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expenses", studioId],
        }),
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
        title: isEdit ? "Expense updated" : "Expense recorded",
        description: `${formatPrice(Number(form.amount))} was ${
          isEdit ? "updated" : "recorded"
        }.`,
        variant: "success",
      });
      onSaved?.();
    },
  });

  async function handleReceiptSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const publicUrl = await uploadExpenseReceipt(api, file);
      setForm((prev) => ({ ...prev, receiptKey: publicUrl }));
      setReceiptName(file.name);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The receipt could not upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !save.isPending) {
          onOpenChange(false);
        }
      }}
      title={isEdit ? "Edit expense" : "Record expense"}
      size="tall"
    >
      <div className={styles.sheetStack}>
        <div className={styles.formGrid}>
          <FormInput
            className={styles.formFull}
            label="Amount (₹)"
            inputMode="decimal"
            value={form.amount}
            onChange={(value) => update({ amount: value })}
            placeholder="0"
            data-testid="expense-amount-input"
          />
          <FormInput
            label="Date"
            type="date"
            value={form.expenseDate}
            onChange={(value) => update({ expenseDate: value })}
          />
          <div className={styles.filterField}>
            <Select
              label="Category"
              placeholder={categories.length === 0 ? "No categories" : "Choose"}
              selectedKey={form.categoryId || null}
              onSelectionChange={(key) =>
                update({ categoryId: key == null ? "" : String(key) })
              }
              isDisabled={categories.length === 0}
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
          <FormInput
            label="Vendor"
            value={form.vendor}
            onChange={(value) => update({ vendor: value })}
            placeholder="Who was paid"
          />
          <div className={styles.filterField}>
            <Select
              label="Payment method"
              placeholder="Choose"
              selectedKey={
                form.paymentMethod === "none" ? null : form.paymentMethod
              }
              onSelectionChange={(key) =>
                update({
                  paymentMethod: (key == null ? "none" : String(key)) as
                    | ExpensePaymentMethod
                    | "none",
                })
              }
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
          <FormInput
            className={styles.formFull}
            label="Description"
            value={form.description}
            onChange={(value) => update({ description: value })}
            placeholder="What this expense covers"
          />
          <FormInput
            className={styles.formFull}
            label="Notes"
            value={form.notes}
            onChange={(value) => update({ notes: value })}
            placeholder="Optional details"
          />
        </div>

        <div className={styles.receiptBox}>
          <span className={styles.summaryLabel}>Receipt</span>
          {receiptName ? (
            <div className={styles.receiptThumb}>
              <span className={styles.receiptThumbName}>{receiptName}</span>
              <TouchButton
                size="sm"
                variant="quiet"
                isDisabled={uploading}
                onClick={() => {
                  update({ receiptKey: "" });
                  setReceiptName("");
                }}
              >
                Remove
              </TouchButton>
            </div>
          ) : (
            <FileTrigger
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              isDisabled={uploading}
              onSelect={(files) => {
                void handleReceiptSelect(files);
              }}
            >
              <TouchButton variant="default" isPending={uploading}>
                {uploading ? "Uploading…" : "Attach receipt"}
              </TouchButton>
            </FileTrigger>
          )}
          {uploadError ? <p>{uploadError}</p> : null}
        </div>

        {save.isError ? (
          <ErrorState
            description={
              save.error instanceof Error
                ? save.error.message
                : "The expense could not be saved."
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
            data-testid="confirm-save-expense"
            onClick={() => save.mutate()}
          >
            {isEdit ? "Save changes" : "Record expense"}
          </TouchButton>
        </div>
      </div>
    </AppSheet>
  );
}

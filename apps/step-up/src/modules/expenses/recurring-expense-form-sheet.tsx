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
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseRecurrenceFrequency,
  FREQUENCY_OPTIONS,
  formatPrice,
  PAYMENT_METHOD_OPTIONS,
  type RecurringExpense,
  todayInputValue,
} from "./types";

type RecurringExpenseFormSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  categories: ExpenseCategory[];
  recurringExpense: RecurringExpense | null;
  onSaved?: () => void;
};

type FormState = {
  amount: string;
  categoryId: string;
  frequency: ExpenseRecurrenceFrequency;
  startDate: string;
  endDate: string;
  vendor: string;
  paymentMethod: ExpensePaymentMethod | "none";
  description: string;
  notes: string;
};

function initialState(recurring: RecurringExpense | null): FormState {
  if (recurring) {
    return {
      amount: String(recurring.amount),
      categoryId: recurring.categoryId,
      frequency: recurring.frequency,
      startDate: recurring.startDate.slice(0, 10),
      endDate: recurring.endDate ? recurring.endDate.slice(0, 10) : "",
      vendor: recurring.vendor ?? "",
      paymentMethod: recurring.paymentMethod ?? "none",
      description: recurring.description ?? "",
      notes: recurring.notes ?? "",
    };
  }
  return {
    amount: "",
    categoryId: "",
    frequency: "MONTHLY",
    startDate: todayInputValue(),
    endDate: "",
    vendor: "",
    paymentMethod: "none",
    description: "",
    notes: "",
  };
}

export function RecurringExpenseFormSheet({
  isOpen,
  onOpenChange,
  studioId,
  categories,
  recurringExpense,
  onSaved,
}: RecurringExpenseFormSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("RecurringExpenseFormSheet");
  const [form, setForm] = useState<FormState>(() =>
    initialState(recurringExpense),
  );

  useEffect(() => {
    if (isOpen) {
      setForm(initialState(recurringExpense));
    }
  }, [isOpen, recurringExpense]);

  const isEdit = recurringExpense !== null;

  const save = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }
      if (!form.categoryId) {
        throw new Error("Choose a category.");
      }
      if (!form.startDate) {
        throw new Error("Choose a start date.");
      }
      const body = {
        amount,
        categoryId: form.categoryId,
        frequency: form.frequency,
        startDate: new Date(`${form.startDate}T00:00:00.000Z`).toISOString(),
        endDate: form.endDate
          ? new Date(`${form.endDate}T00:00:00.000Z`).toISOString()
          : undefined,
        vendor: form.vendor.trim() || null,
        paymentMethod:
          form.paymentMethod === "none" ? null : form.paymentMethod,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        return api.patch<RecurringExpense>(
          `/recurring-expenses/${recurringExpense.id}`,
          body,
        );
      }
      return api.post<RecurringExpense>("/recurring-expenses", {
        ...body,
        studioId,
      });
    },
    onSuccess: async () => {
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["recurring-expenses", studioId],
        }),
        queryClient.invalidateQueries({ queryKey: ["expenses", studioId] }),
        queryClient.invalidateQueries({
          queryKey: ["expense-dashboard", studioId],
        }),
      ]);
      toast({
        title: isEdit ? "Recurring expense updated" : "Recurring expense added",
        description: `${formatPrice(Number(form.amount))} ${form.frequency.toLowerCase()}${
          isEdit ? " was updated." : " will be tracked automatically."
        }`,
        variant: "success",
      });
      onSaved?.();
    },
  });

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
      title={isEdit ? "Edit recurring expense" : "Add recurring expense"}
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
          <div className={styles.filterField}>
            <Select
              label="Frequency"
              selectedKey={form.frequency}
              onSelectionChange={(key) =>
                update({ frequency: String(key) as ExpenseRecurrenceFrequency })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
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
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(value) => update({ startDate: value })}
          />
          <FormInput
            label="End date (optional)"
            type="date"
            value={form.endDate}
            onChange={(value) => update({ endDate: value })}
          />
          <FormInput
            label="Vendor"
            value={form.vendor}
            onChange={(value) => update({ vendor: value })}
            placeholder="Who is paid"
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
            placeholder="What this recurring expense covers"
          />
          <FormInput
            className={styles.formFull}
            label="Notes"
            value={form.notes}
            onChange={(value) => update({ notes: value })}
            placeholder="Optional details"
          />
        </div>

        {save.isError ? (
          <ErrorState
            description={
              save.error instanceof Error
                ? save.error.message
                : "The recurring expense could not be saved."
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
            data-testid="confirm-save-recurring-expense"
            onClick={() => save.mutate()}
          >
            {isEdit ? "Save changes" : "Add recurring expense"}
          </TouchButton>
        </div>
      </div>
    </AppSheet>
  );
}

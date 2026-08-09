import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { formatPrice, type Invoice } from "./invoice-types";

type RefundInvoiceSheetProps = {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
};

function refundableAmount(invoice: Invoice) {
  return Math.max(
    0,
    Math.round((invoice.amount - (invoice.refundedAmount ?? 0)) * 100) / 100,
  );
}

export function RefundInvoiceSheet({
  invoice,
  onOpenChange,
}: RefundInvoiceSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("RefundInvoiceSheet");

  const invoiceId = invoice?.id ?? null;
  const maxRefund = invoice ? refundableAmount(invoice) : 0;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [lastInvoiceId, setLastInvoiceId] = useState(invoiceId);

  if (invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId);
    setAmount("");
    setReason("");
  }

  const refund = useMutation({
    mutationFn: (payload: {
      id: string;
      amount: number;
      reason?: string;
    }) =>
      api.post(`/billing/${payload.id}/refund`, {
        amount: payload.amount,
        ...(payload.reason ? { reason: payload.reason } : {}),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      void queryClient.invalidateQueries({
        queryKey: ["billing", "trainer-analytics"],
      });
      toast({
        title: "Refund recorded",
        description: `${formatPrice(variables.amount)} refunded.`,
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Couldn’t refund invoice",
        description:
          error instanceof Error ? error.message : "Could not refund invoice.",
        variant: "error",
      });
    },
  });

  function submit() {
    if (!invoice) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast({
        title: "Invalid refund amount",
        description: "Enter a refund amount greater than 0.",
        variant: "error",
      });
      return;
    }
    if (parsed > maxRefund) {
      toast({
        title: "Refund too high",
        description: `Maximum refundable is ${formatPrice(maxRefund)}.`,
        variant: "error",
      });
      return;
    }
    refund.mutate({
      id: invoice.id,
      amount: Math.round(parsed * 100) / 100,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
  }

  return (
    <AppSheet
      isOpen={invoice != null}
      onOpenChange={onOpenChange}
      title={
        invoice
          ? `Refund · ${invoice.student?.name ?? invoice.studentId}`
          : "Refund"
      }
    >
      {invoice ? (
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            {[
              invoice.batchName,
              `Paid ${formatPrice(invoice.amount)}`,
              (invoice.refundedAmount ?? 0) > 0
                ? `already refunded ${formatPrice(invoice.refundedAmount ?? 0)}`
                : null,
              `up to ${formatPrice(maxRefund)} remaining`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <FormInput
            label="Refund amount"
            type="number"
            inputMode="decimal"
            min={0.01}
            step="0.01"
            max={maxRefund}
            value={amount}
            onChange={setAmount}
            placeholder={`Up to ${formatPrice(maxRefund)}`}
            data-testid="refund-amount-input"
          />
          <FormInput
            label="Reason (optional)"
            value={reason}
            onChange={setReason}
            placeholder="e.g. partial month remaining"
            data-testid="refund-reason-input"
          />
          {refund.isError ? (
            <ErrorState
              description={
                refund.error instanceof Error
                  ? refund.error.message
                  : "Could not refund invoice."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={refund.isPending}
              isDisabled={maxRefund <= 0}
              data-testid="confirm-refund-invoice"
              onClick={submit}
            >
              Confirm refund
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={refund.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}

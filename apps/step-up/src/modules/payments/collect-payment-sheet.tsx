import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
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
import { InvoiceBill, type InvoiceBillLine } from "./invoice-bill";
import {
  computeGst,
  formatPrice,
  type Invoice,
  type ManualPaymentMethod,
} from "./invoice-types";
import { parseDiscountInput } from "./print-invoice";

type CollectPaymentSheetProps = {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
  confirmTestId: string;
  discountTestIdPrefix?: string;
  resolveStudentName?: (studentId: string) => string | undefined;
};

export function CollectPaymentSheet({
  invoice,
  onOpenChange,
  confirmTestId,
  discountTestIdPrefix = "",
  resolveStudentName,
}: CollectPaymentSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("CollectPaymentSheet");

  const [paymentMethod, setPaymentMethod] =
    useState<ManualPaymentMethod | null>(null);
  const [referralDiscount, setReferralDiscount] = useState("");
  const [studioDiscount, setStudioDiscount] = useState("");

  const invoiceId = invoice?.id ?? null;
  const [lastInvoiceId, setLastInvoiceId] = useState(invoiceId);
  if (invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId);
    setPaymentMethod(null);
    setReferralDiscount("");
    setStudioDiscount("");
  }

  const markPaid = useMutation({
    mutationFn: (payload: {
      id: string;
      paymentMethod: ManualPaymentMethod;
      referralDiscount: number;
      studioDiscount: number;
    }) =>
      api.patch(`/billing/${payload.id}/paid`, {
        paymentMethod: payload.paymentMethod,
        referralDiscount: payload.referralDiscount,
        studioDiscount: payload.studioDiscount,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Payment recorded",
        description: "Invoice marked paid. Receipt emailed to the student.",
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t record payment",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark invoice paid.",
        variant: "error",
      });
    },
  });

  function submit() {
    if (!invoice || !paymentMethod) return;
    const referral = parseDiscountInput(referralDiscount);
    const studio = parseDiscountInput(studioDiscount);
    if (Number.isNaN(referral) || Number.isNaN(studio)) {
      toast({
        title: "Invalid discount",
        description: "Enter a valid amount of 0 or more for each discount.",
        variant: "error",
      });
      return;
    }
    markPaid.mutate({
      id: invoice.id,
      paymentMethod,
      referralDiscount: referral,
      studioDiscount: studio,
    });
  }

  const referral = parseDiscountInput(referralDiscount);
  const studio = parseDiscountInput(studioDiscount);
  const discountsValid = !Number.isNaN(referral) && !Number.isNaN(studio);
  const totalDue =
    invoice && discountsValid
      ? Math.max(
          0,
          Math.round((invoice.amount - referral - studio) * 100) / 100,
        )
      : null;

  const isFamily = invoice?.kind === "FAMILY";
  const isCombined = invoice?.kind === "COMBINED";
  const isFamilyBill = isFamily || isCombined;
  const seats =
    invoice?.purchaseMeta?.coveredStudents ??
    invoice?.familySummary?.coveredStudents ??
    [];

  const lines: InvoiceBillLine[] = [];
  if (invoice) {
    if (isFamilyBill) {
      for (const seat of seats) {
        lines.push({
          id: `seat-${seat.studentId}`,
          label:
            resolveStudentName?.(seat.studentId) ??
            `Member ${seat.studentId.slice(-4)}`,
          value: seat.seatRole === "ADULT" ? "Adult" : "Kid",
        });
      }
      lines.push({
        id: "plan",
        label:
          invoice.familySummary?.planName ??
          (isCombined ? "Combined family" : "Family pack"),
        value: formatPrice(invoice.amount),
      });
    } else {
      lines.push({ label: "Subtotal", value: formatPrice(invoice.amount) });
    }
    if (discountsValid && referral > 0) {
      lines.push({
        label: "Referral discount",
        value: `−${formatPrice(referral)}`,
        variant: "discount",
      });
    }
    if (discountsValid && studio > 0) {
      lines.push({
        label: "Studio discount",
        value: `−${formatPrice(studio)}`,
        variant: "discount",
      });
    }
    const gstPercent = invoice.gstPercent ?? 0;
    if (discountsValid && gstPercent > 0 && totalDue != null) {
      lines.push({
        label: `GST (${gstPercent}%)`,
        value: formatPrice(computeGst(totalDue, gstPercent)),
      });
    }
  }

  const methodLabel =
    paymentMethod === "CASH"
      ? "cash"
      : paymentMethod === "UPI_MANUAL"
        ? "UPI"
        : null;

  return (
    <AppSheet
      isOpen={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      title="Collect payment"
      size="tall"
    >
      {invoice ? (
        <div className={staff.sheetStack}>
          <InvoiceBill
            heading={invoice.student?.name ?? "Invoice"}
            meta={[
              isFamily
                ? "Family pack"
                : isCombined
                  ? "Combined family"
                  : "Individual",
              invoice.batchName,
              `Invoice ${invoice.id.slice(-6).toUpperCase()}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            badge={
              <Badge
                variant={invoice.status === "OVERDUE" ? "danger" : "neutral"}
              >
                {invoice.status}
              </Badge>
            }
            lines={lines}
            totalLabel="Total due"
            totalValue={totalDue != null ? formatPrice(totalDue) : "—"}
            footnote={
              paymentMethod && totalDue != null
                ? `Recording ${formatPrice(totalDue)} received as ${methodLabel}. This cannot be undone from here.`
                : "Optional discounts reduce the amount collected. Choose how payment was received, then confirm."
            }
          />
          <FormInput
            label="Referral discount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            data-testid={`${discountTestIdPrefix}referral-discount`}
            value={referralDiscount}
            onChange={setReferralDiscount}
            placeholder="0"
          />
          <FormInput
            label="Studio discount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            data-testid={`${discountTestIdPrefix}studio-discount`}
            value={studioDiscount}
            onChange={setStudioDiscount}
            placeholder="0"
          />
          {markPaid.isError ? (
            <ErrorState
              description={
                markPaid.error instanceof Error
                  ? markPaid.error.message
                  : "Could not mark invoice paid."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <Checkbox
              isSelected={paymentMethod === "CASH"}
              isDisabled={markPaid.isPending}
              onChange={(selected) =>
                setPaymentMethod(selected ? "CASH" : null)
              }
            >
              Cash
            </Checkbox>
            <Checkbox
              isSelected={paymentMethod === "UPI_MANUAL"}
              isDisabled={markPaid.isPending}
              onChange={(selected) =>
                setPaymentMethod(selected ? "UPI_MANUAL" : null)
              }
            >
              UPI
            </Checkbox>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!paymentMethod || totalDue == null}
              isPending={markPaid.isPending}
              data-testid={confirmTestId}
              onClick={submit}
            >
              {totalDue != null
                ? `Confirm payment · ${formatPrice(totalDue)}`
                : "Confirm payment"}
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}

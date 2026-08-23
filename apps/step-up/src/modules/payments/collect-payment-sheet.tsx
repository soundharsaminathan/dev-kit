import { Badge } from "@dev-ui/components/badge";
import { useToastContext } from "@dev-ui/components/toast";
import { ToggleButton } from "@dev-ui/components/toggle-button";
import { ToggleButtonGroup } from "@dev-ui/components/toggle-button-group";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./collect-payment-sheet.module.scss";
import { InvoiceBill, type InvoiceBillLine } from "./invoice-bill";
import {
  type MarkPaidInvoicePatch,
  patchStudioInvoiceList,
  refreshPaymentQueries,
} from "./invoice-cache";
import {
  type BillingCadence,
  cadenceDisplayLabel,
  cadencePriceHint,
  formatPrice,
  type Invoice,
  type ManualPaymentMethod,
  paymentPlanPrice,
} from "./invoice-types";
import { parseDiscountInput } from "./print-invoice";

type CollectPaymentSheetProps = {
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
  confirmTestId: string;
  discountTestIdPrefix?: string;
  resolveStudentName?: (studentId: string) => string | undefined;
  onPaid?: () => void;
};

export function CollectPaymentSheet({
  invoice,
  onOpenChange,
  confirmTestId,
  discountTestIdPrefix = "",
  resolveStudentName,
  onPaid,
}: CollectPaymentSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("CollectPaymentSheet");

  const [paymentMethod, setPaymentMethod] =
    useState<ManualPaymentMethod | null>(null);
  const [referralDiscount, setReferralDiscount] = useState("");
  const [studioDiscount, setStudioDiscount] = useState("");
  const [discountsOpen, setDiscountsOpen] = useState(false);
  const [selectedCadence, setSelectedCadence] = useState<BillingCadence | null>(
    null,
  );

  const invoiceId = invoice?.id ?? null;
  const [lastInvoiceId, setLastInvoiceId] = useState(invoiceId);
  if (invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId);
    setPaymentMethod(null);
    setReferralDiscount("");
    setStudioDiscount("");
    setDiscountsOpen(false);
    setSelectedCadence(invoice?.paymentPlan?.currentCadence ?? null);
  }

  const paymentPlan = invoice?.paymentPlan ?? null;
  const activeCadence = selectedCadence ?? paymentPlan?.currentCadence ?? null;
  const planChanged =
    Boolean(paymentPlan) &&
    activeCadence != null &&
    activeCadence !== paymentPlan?.currentCadence;

  const markPaid = useMutation({
    mutationFn: (payload: {
      id: string;
      paymentMethod: ManualPaymentMethod;
      referralDiscount: number;
      studioDiscount: number;
      billingCadence?: BillingCadence;
    }) =>
      api.patch<MarkPaidInvoicePatch>(`/billing/${payload.id}/paid`, {
        paymentMethod: payload.paymentMethod,
        referralDiscount: payload.referralDiscount,
        studioDiscount: payload.studioDiscount,
        ...(payload.billingCadence
          ? { billingCadence: payload.billingCadence }
          : {}),
      }),
    onSuccess: async (updated) => {
      patchStudioInvoiceList(queryClient, studioId, {
        id: updated.id,
        status: updated.status,
        amount: updated.amount,
        paymentMethod: updated.paymentMethod ?? null,
        paidAt: updated.paidAt ?? null,
        ...(typeof updated.referralDiscount === "number"
          ? { referralDiscount: updated.referralDiscount }
          : {}),
        ...(typeof updated.studioDiscount === "number"
          ? { studioDiscount: updated.studioDiscount }
          : {}),
      });
      await refreshPaymentQueries(queryClient, studioId);
      toast({
        title: "Payment recorded",
        description: "Invoice marked paid. Receipt emailed to the student.",
        variant: "success",
      });
      onOpenChange(false);
      onPaid?.();
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
    const referralValue = parseDiscountInput(referralDiscount);
    const studioValue = parseDiscountInput(studioDiscount);
    if (Number.isNaN(referralValue) || Number.isNaN(studioValue)) {
      return;
    }
    if (referralValue + studioValue > subtotal) {
      return;
    }
    markPaid.mutate({
      id: invoice.id,
      paymentMethod,
      referralDiscount: referralValue,
      studioDiscount: studioValue,
      ...(activeCadence ? { billingCadence: activeCadence } : {}),
    });
  }

  const referral = parseDiscountInput(referralDiscount);
  const studio = parseDiscountInput(studioDiscount);
  const discountsParsed = !Number.isNaN(referral) && !Number.isNaN(studio);

  const subtotal =
    invoice && activeCadence && paymentPlan
      ? paymentPlanPrice(paymentPlan, activeCadence, invoice.amount)
      : (invoice?.amount ?? 0);

  const discountTotal =
    discountsParsed && (referral > 0 || studio > 0)
      ? Math.round((referral + studio) * 100) / 100
      : 0;

  const discountsExceed =
    discountsParsed && discountTotal > subtotal && discountTotal > 0;

  const discountError =
    referralDiscount !== "" && Number.isNaN(referral)
      ? "Enter a valid referral discount of 0 or more."
      : studioDiscount !== "" && Number.isNaN(studio)
        ? "Enter a valid studio discount of 0 or more."
        : discountsExceed
          ? "Discounts cannot exceed the invoice amount."
          : null;

  const discountsValid = discountsParsed && !discountsExceed;

  const totalDue =
    invoice && discountsValid
      ? Math.round((subtotal - referral - studio) * 100) / 100
      : null;

  const isFamily = invoice?.kind === "FAMILY";
  const isCombined = invoice?.kind === "COMBINED";
  const isFamilyBill = isFamily || isCombined;
  const seats =
    invoice?.purchaseMeta?.coveredStudents ??
    invoice?.familySummary?.coveredStudents ??
    [];

  const planLabel =
    activeCadence != null
      ? cadenceDisplayLabel(activeCadence)
      : ((invoice?.membership?.subscription?.billingCadence
          ? cadenceDisplayLabel(invoice.membership.subscription.billingCadence)
          : invoice?.familySummary?.planName) ?? null);

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
        value: formatPrice(subtotal),
      });
    } else {
      if (planLabel) {
        lines.push({
          id: "current-plan",
          label: "Current plan",
          value: planLabel,
        });
      }
      lines.push({ label: "Subtotal", value: formatPrice(subtotal) });
    }
    if (discountsValid && discountTotal > 0) {
      lines.push({
        label: "Discount",
        value: `−${formatPrice(discountTotal)}`,
        variant: "discount",
      });
    }
  }

  const pending = markPaid.isPending;
  const ctaLabel = !paymentMethod
    ? "Select payment method"
    : pending && totalDue != null
      ? `Collecting ${formatPrice(totalDue)}…`
      : totalDue != null
        ? `Collect ${formatPrice(totalDue)}`
        : "Collect payment";

  return (
    <AppSheet
      isOpen={Boolean(invoice)}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      title="Collect payment"
      size="wide"
    >
      {invoice ? (
        <div className={styles.root}>
          <div className={styles.scroll}>
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
            />

            {paymentPlan ? (
              <section className={styles.planSection} aria-label="Payment plan">
                <p className={styles.sectionLabel}>Payment plan</p>
                <ToggleButtonGroup
                  aria-label="Payment plan"
                  selectionMode="single"
                  selectedKeys={activeCadence ? [activeCadence] : []}
                  disallowEmptySelection
                  size="sm"
                  isDisabled={pending}
                  data-testid={`${discountTestIdPrefix}payment-plan`}
                  onSelectionChange={(keys) => {
                    const next = String([...keys][0] ?? "");
                    if (next === "MONTHLY" || next === "QUARTERLY") {
                      setSelectedCadence(next);
                    }
                  }}
                >
                  {paymentPlan.options.map((option) => (
                    <ToggleButton
                      key={option.cadence}
                      id={option.cadence}
                      data-testid={`${discountTestIdPrefix}plan-${option.cadence.toLowerCase()}`}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {activeCadence ? (
                  <p className={styles.planHint}>
                    {cadencePriceHint(paymentPlan, activeCadence)}
                  </p>
                ) : null}
                {planChanged ? (
                  <p className={styles.planNote}>
                    Plan changes apply from this payment
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className={styles.discountSection}>
              {discountsOpen ? (
                <div className={styles.discountFields}>
                  <div className={styles.discountHeader}>
                    <p className={styles.sectionLabel}>Discounts</p>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => {
                        setDiscountsOpen(false);
                        setReferralDiscount("");
                        setStudioDiscount("");
                      }}
                      disabled={pending}
                    >
                      Hide
                    </button>
                  </div>
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
                    isDisabled={pending}
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
                    isDisabled={pending}
                  />
                  {discountError ? (
                    <p className={styles.fieldError} role="alert">
                      {discountError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.addDiscount}
                  data-testid={`${discountTestIdPrefix}add-discount`}
                  onClick={() => setDiscountsOpen(true)}
                  disabled={pending}
                >
                  + Add discount
                </button>
              )}
            </section>

            <section
              className={styles.methodSection}
              aria-label="Payment method"
            >
              <p className={styles.sectionLabel}>Payment method</p>
              <ToggleButtonGroup
                aria-label="Payment method"
                selectionMode="single"
                selectedKeys={paymentMethod ? [paymentMethod] : []}
                size="sm"
                isDisabled={pending}
                data-testid={`${discountTestIdPrefix}payment-method`}
                onSelectionChange={(keys) => {
                  const next = String([...keys][0] ?? "");
                  if (next === "CASH" || next === "UPI_MANUAL") {
                    setPaymentMethod(next);
                  } else {
                    setPaymentMethod(null);
                  }
                }}
                className={styles.methodGroup}
              >
                <ToggleButton
                  id="CASH"
                  data-testid={`${discountTestIdPrefix}method-cash`}
                >
                  Cash
                </ToggleButton>
                <ToggleButton
                  id="UPI_MANUAL"
                  data-testid={`${discountTestIdPrefix}method-upi`}
                >
                  UPI
                </ToggleButton>
              </ToggleButtonGroup>
            </section>

            {markPaid.isError ? (
              <ErrorState
                description={
                  markPaid.error instanceof Error
                    ? markPaid.error.message
                    : "Could not mark invoice paid."
                }
              />
            ) : null}
          </div>

          <div className={styles.footer}>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!paymentMethod || totalDue == null || pending}
              isPending={pending}
              data-testid={confirmTestId}
              onClick={submit}
            >
              {ctaLabel}
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}

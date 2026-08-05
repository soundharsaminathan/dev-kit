import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { AppSheet } from "@/modules/ui/app-sheet";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import { InvoiceBill, type InvoiceBillLine } from "./invoice-bill";
import {
  formatPrice,
  type ManualPaymentMethod,
  type StudioFamily,
} from "./invoice-types";

type StudioBatch = {
  id: string;
  name: string;
  category: "KIDS" | "ADULTS";
  active: boolean;
};

type FamilyPlan = {
  id: string;
  name: string;
  kind: "FAMILY" | "INDIVIDUAL";
  adultSeats: number;
  kidSeats: number;
  price: number | string;
  billingCadence: "MONTHLY" | "QUARTERLY";
  active: boolean;
};

type FamilySeat = {
  id: string;
  name: string;
  seatRole: "ADULT" | "KID";
};

type FamilyPaySheetProps = {
  family: StudioFamily | null;
  onOpenChange: (open: boolean) => void;
};

export function FamilyPaySheet({ family, onOpenChange }: FamilyPaySheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("FamilyPaySheet");

  const isOpen = Boolean(family);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [seatBatchIds, setSeatBatchIds] = useState<Record<string, string>>({});
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<ManualPaymentMethod | null>(null);

  const familyKey = family?.ownerId ?? null;
  const [lastFamilyKey, setLastFamilyKey] = useState(familyKey);
  if (familyKey !== lastFamilyKey) {
    setLastFamilyKey(familyKey);
    setStep(1);
    setExcludedIds([]);
    setSeatBatchIds({});
    setSubscriptionId(null);
    setPaymentMethod(null);
  }

  const batchesQuery = useQuery({
    queryKey: ["batches", studioId, "family-pay"],
    queryFn: () =>
      api.get<StudioBatch[]>(`/batches/studio/${studioId}?activeOnly=true`),
    enabled: isOpen,
  });

  const plansQuery = useQuery({
    queryKey: ["subscriptions", studioId, "family"],
    queryFn: () => api.get<FamilyPlan[]>(`/subscriptions/studio/${studioId}`),
    enabled: isOpen,
  });

  const seats = useMemo<FamilySeat[]>(() => {
    if (!family) return [];
    const rows: FamilySeat[] = family.members.map((member) => ({
      id: member.id,
      name: member.name,
      seatRole: member.seatRole,
    }));
    if (family.ownerRole === "STUDENT") {
      rows.unshift({
        id: family.ownerId,
        name: family.ownerName,
        seatRole: "ADULT",
      });
    }
    return rows;
  }, [family]);

  const includedSeats = seats.filter((seat) => !excludedIds.includes(seat.id));
  const adultCount = includedSeats.filter(
    (seat) => seat.seatRole === "ADULT",
  ).length;
  const kidCount = includedSeats.filter(
    (seat) => seat.seatRole === "KID",
  ).length;

  const adultBatches = useMemo(
    () =>
      (batchesQuery.data ?? []).filter(
        (batch) => batch.active && batch.category === "ADULTS",
      ),
    [batchesQuery.data],
  );
  const kidBatches = useMemo(
    () =>
      (batchesQuery.data ?? []).filter(
        (batch) => batch.active && batch.category === "KIDS",
      ),
    [batchesQuery.data],
  );

  const matchingPlans = useMemo(
    () =>
      (plansQuery.data ?? []).filter(
        (plan) =>
          plan.active &&
          plan.kind === "FAMILY" &&
          plan.adultSeats === adultCount &&
          plan.kidSeats === kidCount,
      ),
    [plansQuery.data, adultCount, kidCount],
  );

  const selectedPlan =
    matchingPlans.find((plan) => plan.id === subscriptionId) ?? null;

  const classesReady =
    includedSeats.length > 0 &&
    includedSeats.every((seat) => Boolean(seatBatchIds[seat.id]));

  const checkout = useMutation({
    mutationFn: () => {
      if (!family || !subscriptionId || !paymentMethod) {
        throw new Error("Complete all steps before confirming.");
      }
      return api.post("/billing/family-checkout", {
        studioId,
        purchaserUserId: family.ownerId,
        subscriptionId,
        coveredStudents: includedSeats.map((seat) => ({
          studentId: seat.id,
          seatRole: seat.seatRole,
          batchId: seatBatchIds[seat.id]!,
        })),
        paymentMethod,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Family payment recorded",
        description: "Membership is active and payment was recorded.",
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Couldn’t complete family payment",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    },
  });

  function toggleSeat(seatId: string, included: boolean) {
    setExcludedIds((current) =>
      included
        ? current.filter((id) => id !== seatId)
        : current.includes(seatId)
          ? current
          : [...current, seatId],
    );
    if (!included) {
      setSeatBatchIds((current) => {
        const next = { ...current };
        delete next[seatId];
        return next;
      });
    }
  }

  const batchName = (batchId: string | undefined) =>
    (batchesQuery.data ?? []).find((batch) => batch.id === batchId)?.name;

  const billLines: InvoiceBillLine[] = selectedPlan
    ? [
        {
          id: "plan",
          label: selectedPlan.name,
          hint:
            selectedPlan.billingCadence === "QUARTERLY"
              ? "Billed quarterly"
              : "Billed monthly",
          value: formatPrice(selectedPlan.price),
        },
        ...includedSeats.map((seat) => ({
          id: `seat-${seat.id}`,
          label: seat.name,
          hint: batchName(seatBatchIds[seat.id]) ?? "No class",
          value: seat.seatRole === "ADULT" ? "Adult" : "Kid",
        })),
      ]
    : [];

  const stepTitle =
    step === 1
      ? "Family payment · Classes"
      : step === 2
        ? "Family payment · Pack"
        : "Family payment · Confirm";

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      title={stepTitle}
      size="tall"
    >
      {family ? (
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Step {step} of 3
            {step === 1
              ? " — choose who is joining and a class for each."
              : step === 2
                ? " — pick a family pack matching the seats."
                : " — review the bill and record the payment."}
          </p>

          {step === 1 ? (
            <>
              {batchesQuery.isError ? (
                <ErrorState
                  description={
                    batchesQuery.error instanceof Error
                      ? batchesQuery.error.message
                      : "Could not load classes."
                  }
                />
              ) : null}

              <div className={staff.list}>
                {seats.map((seat) => {
                  const included = !excludedIds.includes(seat.id);
                  const batches =
                    seat.seatRole === "ADULT" ? adultBatches : kidBatches;
                  return (
                    <div key={seat.id} className={staff.rowCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.rowTitle}>{seat.name}</span>
                        <Badge variant="neutral">
                          {seat.seatRole === "ADULT" ? "Adult" : "Kid"}
                        </Badge>
                      </div>
                      <div className={staff.rowActions}>
                        <Checkbox
                          isSelected={included}
                          onChange={(selected) => toggleSeat(seat.id, selected)}
                        >
                          Include in this payment
                        </Checkbox>
                      </div>
                      {included ? (
                        <Select
                          label={`Class for ${seat.name}`}
                          selectedKey={seatBatchIds[seat.id] ?? null}
                          onSelectionChange={(key) => {
                            if (key) {
                              setSeatBatchIds((current) => ({
                                ...current,
                                [seat.id]: String(key),
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map((batch) => (
                              <SelectItem key={batch.id} id={batch.id}>
                                {batch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className={staff.sheetActions}>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isDisabled={!classesReady}
                  data-testid="family-pay-next"
                  onClick={() => {
                    setSubscriptionId(null);
                    setStep(2);
                  }}
                >
                  Next · Choose pack
                </TouchButton>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className={staff.rowMeta}>
                Matching {adultCount} adult{adultCount === 1 ? "" : "s"} and{" "}
                {kidCount} kid{kidCount === 1 ? "" : "s"}.
              </p>

              {matchingPlans.length === 0 ? (
                <EmptyState
                  title="No matching packs"
                  description="No active family pack matches these seats. Go back to include or exclude members, or add a pack in Subscriptions."
                />
              ) : (
                <div className={staff.list}>
                  {matchingPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={staff.rowCard}
                      data-selected={
                        subscriptionId === plan.id ? "true" : undefined
                      }
                      onClick={() => setSubscriptionId(plan.id)}
                    >
                      <div className={staff.attentionTop}>
                        <span className={staff.rowTitle}>{plan.name}</span>
                        <span className={staff.rowMeta}>
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                      <p className={staff.rowMeta}>
                        {plan.billingCadence === "QUARTERLY"
                          ? "Quarterly"
                          : "Monthly"}{" "}
                        · {plan.adultSeats} adult
                        {plan.adultSeats === 1 ? "" : "s"} · {plan.kidSeats} kid
                        {plan.kidSeats === 1 ? "" : "s"}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className={staff.sheetActions}>
                <TouchButton
                  variant="quiet"
                  fullWidth
                  onClick={() => setStep(1)}
                >
                  Back
                </TouchButton>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isDisabled={!subscriptionId}
                  onClick={() => {
                    setPaymentMethod(null);
                    setStep(3);
                  }}
                >
                  Next · Payment
                </TouchButton>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <InvoiceBill
                heading={`${family.ownerName}’s family`}
                meta={`${adultCount} adult${adultCount === 1 ? "" : "s"} · ${kidCount} kid${kidCount === 1 ? "" : "s"} · Paid by ${family.ownerName}`}
                lines={billLines}
                totalLabel="Total due"
                totalValue={
                  selectedPlan ? formatPrice(selectedPlan.price) : "—"
                }
                footnote={
                  paymentMethod
                    ? `Recording ${selectedPlan ? formatPrice(selectedPlan.price) : "payment"} received as ${paymentMethod === "CASH" ? "cash" : "UPI"}. Membership activates immediately.`
                    : "Choose how payment was received, then confirm."
                }
              />

              {checkout.isError ? (
                <ErrorState
                  description={
                    checkout.error instanceof Error
                      ? checkout.error.message
                      : "Checkout failed."
                  }
                />
              ) : null}

              <div className={staff.sheetActions}>
                <TouchButton
                  variant={paymentMethod === "CASH" ? "primary" : "default"}
                  fullWidth
                  isDisabled={checkout.isPending}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  Cash
                </TouchButton>
                <TouchButton
                  variant={
                    paymentMethod === "UPI_MANUAL" ? "primary" : "default"
                  }
                  fullWidth
                  isDisabled={checkout.isPending}
                  onClick={() => setPaymentMethod("UPI_MANUAL")}
                >
                  UPI
                </TouchButton>
                <TouchButton
                  variant="quiet"
                  fullWidth
                  onClick={() => setStep(2)}
                >
                  Back
                </TouchButton>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isDisabled={!paymentMethod}
                  isPending={checkout.isPending}
                  data-testid="confirm-family-pay"
                  onClick={() => checkout.mutate()}
                >
                  Confirm and activate
                </TouchButton>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </AppSheet>
  );
}

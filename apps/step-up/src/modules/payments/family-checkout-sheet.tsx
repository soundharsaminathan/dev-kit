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

type StudioMember = {
  id: string;
  name: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};

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

type PaymentMethod = "CASH" | "UPI_MANUAL";

type FamilyCheckoutSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function FamilyCheckoutSheet({
  isOpen,
  onOpenChange,
}: FamilyCheckoutSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("FamilyCheckoutSheet");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adultIds, setAdultIds] = useState<string[]>([]);
  const [kidIds, setKidIds] = useState<string[]>([]);
  const [seatBatchIds, setSeatBatchIds] = useState<Record<string, string>>({});
  const [purchaserUserId, setPurchaserUserId] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const membersQuery = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    enabled: isOpen,
  });

  const batchesQuery = useQuery({
    queryKey: ["batches", studioId, "family-checkout"],
    queryFn: () =>
      api.get<StudioBatch[]>(`/batches/studio/${studioId}?activeOnly=true`),
    enabled: isOpen,
  });

  const plansQuery = useQuery({
    queryKey: ["subscriptions", studioId, "family"],
    queryFn: () => api.get<FamilyPlan[]>(`/subscriptions/studio/${studioId}`),
    enabled: isOpen,
  });

  const students =
    membersQuery.data?.filter((member) => member.role === "STUDENT") ?? [];
  const purchasers =
    membersQuery.data?.filter(
      (member) => member.role === "STUDENT" || member.role === "PARENT",
    ) ?? [];

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

  const matchingPlans = useMemo(() => {
    const adultCount = adultIds.length;
    const kidCount = kidIds.length;
    return (plansQuery.data ?? []).filter(
      (plan) =>
        plan.active &&
        plan.kind === "FAMILY" &&
        plan.adultSeats === adultCount &&
        plan.kidSeats === kidCount,
    );
  }, [plansQuery.data, adultIds.length, kidIds.length]);

  const selectedPlan =
    matchingPlans.find((plan) => plan.id === subscriptionId) ?? null;

  const seatsReady =
    adultIds.length + kidIds.length > 0 &&
    [...adultIds, ...kidIds].every((id) => Boolean(seatBatchIds[id])) &&
    Boolean(purchaserUserId);

  const checkout = useMutation({
    mutationFn: () => {
      if (!purchaserUserId || !subscriptionId || !paymentMethod) {
        throw new Error("Complete all steps before confirming.");
      }
      const coveredStudents = [
        ...adultIds.map((studentId) => ({
          studentId,
          seatRole: "ADULT" as const,
          batchId: seatBatchIds[studentId]!,
        })),
        ...kidIds.map((studentId) => ({
          studentId,
          seatRole: "KID" as const,
          batchId: seatBatchIds[studentId]!,
        })),
      ];
      return api.post("/billing/family-checkout", {
        studioId,
        purchaserUserId,
        subscriptionId,
        coveredStudents,
        paymentMethod,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Family pack sold",
        description: "Membership is active and payment was recorded.",
        variant: "success",
      });
      resetAndClose();
    },
    onError: (error) => {
      toast({
        title: "Couldn’t complete family checkout",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    },
  });

  function resetAndClose() {
    setStep(1);
    setAdultIds([]);
    setKidIds([]);
    setSeatBatchIds({});
    setPurchaserUserId(null);
    setSubscriptionId(null);
    setPaymentMethod(null);
    onOpenChange(false);
  }

  function toggleSeat(
    role: "ADULT" | "KID",
    studentId: string,
    selected: boolean,
  ) {
    if (role === "ADULT") {
      setAdultIds((current) =>
        selected
          ? current.includes(studentId)
            ? current
            : [...current, studentId]
          : current.filter((id) => id !== studentId),
      );
      setKidIds((current) => current.filter((id) => id !== studentId));
    } else {
      setKidIds((current) =>
        selected
          ? current.includes(studentId)
            ? current
            : [...current, studentId]
          : current.filter((id) => id !== studentId),
      );
      setAdultIds((current) => current.filter((id) => id !== studentId));
    }
    if (!selected) {
      setSeatBatchIds((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
    }
  }

  function setBatchForSeat(studentId: string, batchId: string) {
    setSeatBatchIds((current) => ({ ...current, [studentId]: batchId }));
  }

  const methodLabel =
    paymentMethod === "CASH"
      ? "cash"
      : paymentMethod === "UPI_MANUAL"
        ? "UPI"
        : null;

  const stepTitle =
    step === 1
      ? "Family pack · Seats"
      : step === 2
        ? "Family pack · Plan"
        : "Family pack · Payment";

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) resetAndClose();
        else onOpenChange(true);
      }}
      title={stepTitle}
      size="tall"
    >
      <div className={staff.sheetStack}>
        <p className={staff.rowMeta}>
          Step {step} of 3
          {step === 1
            ? " — pick adults, kids, and a class for each."
            : step === 2
              ? " — choose a pack that matches the seat counts."
              : " — record how payment was received."}
        </p>

        {step === 1 ? (
          <>
            {membersQuery.isError || batchesQuery.isError ? (
              <ErrorState
                description={
                  membersQuery.error instanceof Error
                    ? membersQuery.error.message
                    : batchesQuery.error instanceof Error
                      ? batchesQuery.error.message
                      : "Could not load students or classes."
                }
              />
            ) : null}

            <Select
              label="Purchaser"
              selectedKey={purchaserUserId}
              onSelectionChange={(key) =>
                setPurchaserUserId(key ? String(key) : null)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Who is paying?" />
              </SelectTrigger>
              <SelectContent>
                {purchasers.map((member) => (
                  <SelectItem key={member.id} id={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className={staff.sectionTitle}>
              Adults ({adultIds.length}) · Kids ({kidIds.length})
            </p>

            {students.length === 0 && !membersQuery.isLoading ? (
              <EmptyState
                title="No students"
                description="Add studio students before selling a family pack."
              />
            ) : null}

            <div className={staff.list}>
              {students.map((student) => {
                const isAdult = adultIds.includes(student.id);
                const isKid = kidIds.includes(student.id);
                const batches = isAdult
                  ? adultBatches
                  : isKid
                    ? kidBatches
                    : [];
                return (
                  <div key={student.id} className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>{student.name}</span>
                    </div>
                    <div className={staff.rowActions}>
                      <Checkbox
                        isSelected={isAdult}
                        onChange={(selected) =>
                          toggleSeat("ADULT", student.id, selected)
                        }
                      >
                        Adult
                      </Checkbox>
                      <Checkbox
                        isSelected={isKid}
                        onChange={(selected) =>
                          toggleSeat("KID", student.id, selected)
                        }
                      >
                        Kid
                      </Checkbox>
                    </div>
                    {isAdult || isKid ? (
                      <Select
                        label={`Class for ${student.name}`}
                        selectedKey={seatBatchIds[student.id] ?? null}
                        onSelectionChange={(key) => {
                          if (key) setBatchForSeat(student.id, String(key));
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
                isDisabled={!seatsReady}
                onClick={() => {
                  setSubscriptionId(null);
                  setStep(2);
                }}
              >
                Next · Choose plan
              </TouchButton>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className={staff.rowMeta}>
              Matching {adultIds.length} adult
              {adultIds.length === 1 ? "" : "s"} and {kidIds.length} kid
              {kidIds.length === 1 ? "" : "s"}.
            </p>

            {matchingPlans.length === 0 ? (
              <EmptyState
                title="No matching packs"
                description="No active family pack matches these seat counts. Adjust seats or add a pack in Subscriptions."
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
              <TouchButton variant="quiet" fullWidth onClick={() => setStep(1)}>
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
            <p className={staff.rowMeta}>
              {selectedPlan
                ? `${selectedPlan.name} · ${formatPrice(selectedPlan.price)}`
                : "Confirm payment"}
            </p>
            <p className={staff.rowMeta}>
              {paymentMethod
                ? `Record ${selectedPlan ? formatPrice(selectedPlan.price) : "payment"} as ${methodLabel}. Membership activates immediately.`
                : "Choose how payment was received."}
            </p>

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
                variant={paymentMethod === "UPI_MANUAL" ? "primary" : "default"}
                fullWidth
                isDisabled={checkout.isPending}
                onClick={() => setPaymentMethod("UPI_MANUAL")}
              >
                UPI
              </TouchButton>
              <TouchButton variant="quiet" fullWidth onClick={() => setStep(2)}>
                Back
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                isDisabled={!paymentMethod}
                isPending={checkout.isPending}
                data-testid="confirm-family-checkout"
                onClick={() => checkout.mutate()}
              >
                Confirm and activate
              </TouchButton>
            </div>
          </>
        ) : null}
      </div>
    </AppSheet>
  );
}

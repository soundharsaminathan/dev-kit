import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { fetchDiscoverTrialSlots } from "@/modules/student-landing/api";
import { formatPriceFrom } from "@/modules/student-landing/format";
import { STUDENT_TRIAL } from "@/modules/student-landing/content";
import type { DiscoverTrialSlot } from "@/modules/student-landing/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { SuccessState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  bookTypeHint,
  bookTypeLabel,
  childAudienceBlocked,
  formatBookWhen,
  formatExactPaise,
  marketplaceBookingStatusLabel,
  visibleMarketplaceBookTypes,
  type BookSheetTarget,
  type MarketplaceBookType,
} from "./book";
import {
  fetchMarketplaceClass,
  fetchMarketplaceStudio,
  fetchMarketplaceTrainer,
} from "./catalog";
import type { MarketplaceClassPlan } from "./types";
import styles from "./book-sheet.module.scss";

const SLOT_SKELETON_KEYS = ["book-slot-0", "book-slot-1", "book-slot-2"] as const;

type SheetStep = "type" | "details" | "account" | "success";

type FamilyMember = {
  id: string;
  name: string;
  kind: "KID" | "CO_STUDENT";
};

type SuccessFact = {
  type: MarketplaceBookType;
  title: string;
  when: string | null;
  place: string | null;
  status: string;
  bookingId?: string;
  invoiceId?: string;
};

function validatePhone(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

function groupSlotsByBatch(slots: DiscoverTrialSlot[]) {
  const groups: Array<{
    batchId: string;
    batchName: string;
    slots: DiscoverTrialSlot[];
  }> = [];
  const indexById = new Map<string, number>();
  for (const slot of slots) {
    const existing = indexById.get(slot.batchId);
    if (existing == null) {
      indexById.set(slot.batchId, groups.length);
      groups.push({
        batchId: slot.batchId,
        batchName: slot.batchName,
        slots: [slot],
      });
      continue;
    }
    groups[existing]?.slots.push(slot);
  }
  return groups;
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function SlotSkeleton() {
  return (
    <div
      className={styles.slots}
      role="status"
      aria-busy="true"
      aria-label={STUDENT_TRIAL.loadingSlots}
    >
      {SLOT_SKELETON_KEYS.map((key) => (
        <div key={key} className={styles.slotSkeleton} aria-hidden>
          <SkeletonBlock height="1rem" width="55%" radius="4px" />
          <SkeletonBlock height="0.75rem" width="35%" radius="4px" />
        </div>
      ))}
    </div>
  );
}

export function BookSheet({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BookSheetTarget | null;
}) {
  const navigate = useNavigate();
  const api = useApi();
  const { user, signUp, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<SheetStep>("type");
  const [bookType, setBookType] = useState<MarketplaceBookType>("TRIAL");
  const [sessionId, setSessionId] = useState("");
  const [planId, setPlanId] = useState("");
  const [studioPick, setStudioPick] = useState("");
  const [trainerPick, setTrainerPick] = useState("");
  const [branchId, setBranchId] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [forChild, setForChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childId, setChildId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessFact | null>(null);
  const [openKey, setOpenKey] = useState("");
  const registerRef = useRef<HTMLFieldSetElement>(null);
  const nextOpenKey = open
    ? `${target?.source ?? ""}:${target?.studioId ?? ""}:${target?.classSlug ?? target?.batchId ?? ""}:${target?.trainerId ?? ""}`
    : "";

  if (nextOpenKey !== openKey) {
    setOpenKey(nextOpenKey);
    setStep("type");
    setBookType("TRIAL");
    setSessionId("");
    setPlanId("");
    setStudioPick(target?.studioId ?? "");
    setTrainerPick(target?.trainerId ?? "");
    setBranchId("");
    setStartsLocal("");
    setPhone("");
    setPassword("");
    setForChild(false);
    setChildName("");
    setChildId("");
    setError(null);
    setSuccess(null);
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }

  const studioId = studioPick || target?.studioId || "";
  const studioName = target?.studioName ?? "";

  const classKey = target?.classSlug || target?.batchId || "";
  const classQuery = useQuery({
    queryKey: ["marketplace-class", classKey],
    queryFn: () => fetchMarketplaceClass(classKey),
    enabled: open && Boolean(classKey),
    staleTime: 30_000,
  });
  const studioQuery = useQuery({
    queryKey: ["marketplace-studio", studioId],
    queryFn: () => fetchMarketplaceStudio(studioId),
    enabled: open && Boolean(studioId),
    staleTime: 30_000,
  });
  const trainerQuery = useQuery({
    queryKey: ["marketplace-trainer", trainerPick || target?.trainerId],
    queryFn: () =>
      fetchMarketplaceTrainer((trainerPick || target?.trainerId) as string),
    enabled: open && Boolean(trainerPick || target?.trainerId),
    staleTime: 30_000,
  });
  const slotsQuery = useQuery({
    queryKey: ["discover-trial-slots", studioId],
    queryFn: () => fetchDiscoverTrialSlots(studioId),
    enabled: open && Boolean(studioId),
    staleTime: 30_000,
  });
  const familyQuery = useQuery({
    queryKey: ["users", user?.id, "family-members"],
    queryFn: () => api.get<FamilyMember[]>("/users/me/family-members"),
    enabled: open && Boolean(user?.id),
    staleTime: 60_000,
  });

  const klass = classQuery.data;
  const studio = studioQuery.data;
  const trainer = trainerQuery.data;
  const types = useMemo(
    () =>
      visibleMarketplaceBookTypes({
        canTrial: target?.canTrial ?? klass?.canTrial ?? studio?.canTrial ?? Boolean(studioId),
        canEnroll: target?.canEnroll ?? klass?.canEnroll ?? false,
        canPrivate:
          target?.canPrivate ??
          klass?.canPrivate ??
          studio?.canPrivate ??
          trainer?.canPrivate ??
          false,
        canFloorHire: target?.canFloorHire ?? studio?.canFloorHire ?? false,
        source: target?.source ?? "studio",
        viewerEnrolled: target?.viewerEnrolled ?? klass?.viewerEnrolled,
      }),
    [klass, studio, target, trainer, studioId],
  );

  useEffect(() => {
    if (!open || types.length === 0) return;
    if (!types.includes(bookType)) {
      setBookType(types[0] ?? "TRIAL");
    }
  }, [bookType, open, types]);

  const slots = useMemo(() => {
    const all = slotsQuery.data ?? [];
    if (!target?.batchId) return all;
    return all.filter((slot) => slot.batchId === target.batchId);
  }, [slotsQuery.data, target?.batchId]);
  const sections = useMemo(() => groupSlotsByBatch(slots), [slots]);
  const selectedSlot = slots.find((slot) => slot.sessionId === sessionId) ?? null;
  const privateTrainers = useMemo(
    () => (studio?.trainers ?? []).filter((item) => item.canPrivate),
    [studio?.trainers],
  );
  const privateStudios = (trainer?.studios ?? []).filter((item) => item.canPrivate);
  const branches = studio?.branches ?? [];
  const resolvedTrainerId =
    trainerPick || target?.trainerId || klass?.trainerId || "";
  const showTrainerPicker =
    bookType === "PRIVATE" &&
    (target?.source === "studio" || target?.source === "studio-detail");
  const pickedTrainer =
    privateTrainers.find((item) => item.id === resolvedTrainerId) ??
    (trainer && trainer.id === resolvedTrainerId ? trainer : null);
  const plans = klass?.plans ?? [];
  const selectedPlan = plans.find((plan) => plan.id === planId) ?? plans[0] ?? null;
  const durationMinutes =
    bookType === "FLOOR_HIRE"
      ? (studio?.floorHireSlotMinutes ?? 60)
      : (studio?.privateSessionMinutes ?? 60);
  const priceLabel =
    bookType === "JOIN"
      ? formatPriceFrom(selectedPlan?.price ?? null, selectedPlan?.cadence ?? null)
      : bookType === "FLOOR_HIRE"
        ? formatExactPaise(studio?.floorHirePaise)
        : bookType === "PRIVATE"
          ? formatExactPaise(studio?.privateSessionPaise)
          : null;

  const classAudience =
    selectedSlot?.classAudience ??
    (selectedSlot?.audience === "KIDS" || selectedSlot?.audience === "ADULTS"
      ? selectedSlot.audience
      : null) ??
    klass?.audience ??
    target?.audience ??
    null;

  const needsAccount = !user;
  const kids = (familyQuery.data ?? []).filter((member) => member.kind === "KID");

  useEffect(() => {
    if (!open || sessionId || slots.length !== 1) return;
    const only = slots[0];
    if (only) setSessionId(only.sessionId);
  }, [open, sessionId, slots]);

  useEffect(() => {
    if (!open || branchId || branches.length !== 1) return;
    const only = branches[0];
    if (only) setBranchId(only.id);
  }, [branchId, branches, open]);

  useEffect(() => {
    if (!open || planId || !selectedPlan) return;
    setPlanId(selectedPlan.id);
  }, [open, planId, selectedPlan]);

  useEffect(() => {
    if (!open || bookType !== "PRIVATE" || trainerPick) return;
    if (target?.trainerId) {
      setTrainerPick(target.trainerId);
      return;
    }
    if (klass?.trainerId) {
      setTrainerPick(klass.trainerId);
      return;
    }
    if (privateTrainers.length !== 1) return;
    const only = privateTrainers[0];
    if (only) setTrainerPick(only.id);
  }, [
    bookType,
    klass?.trainerId,
    open,
    privateTrainers,
    target?.trainerId,
    trainerPick,
  ]);

  useEffect(() => {
    if (step !== "account") return;
    const field = registerRef.current?.querySelector<HTMLInputElement>("input");
    field?.focus();
  }, [step]);

  const recap = useMemo(() => {
    if (bookType === "TRIAL" && selectedSlot) {
      return [selectedSlot.batchName, formatBookWhen(selectedSlot.startsAt)]
        .filter(Boolean)
        .join(" · ");
    }
    if (bookType === "JOIN" && (klass?.name || target?.className)) {
      return [klass?.name ?? target?.className, selectedPlan?.name]
        .filter(Boolean)
        .join(" · ");
    }
    if (bookType === "PRIVATE") {
      return [
        pickedTrainer?.name ?? target?.trainerName,
        studioName,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (bookType === "FLOOR_HIRE") {
      return [
        branches.find((branch) => branch.id === branchId)?.name,
        studioName,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    return [target?.className, trainer?.name ?? target?.trainerName, studioName]
      .filter(Boolean)
      .join(" · ");
  }, [
    bookType,
    branchId,
    branches,
    klass?.name,
    pickedTrainer?.name,
    selectedPlan?.name,
    selectedSlot,
    studioName,
    target?.className,
    target?.trainerName,
    trainer?.name,
  ]);

  const title =
    step === "success"
      ? "You're booked"
      : step === "account"
        ? STUDENT_TRIAL.registerTitle
        : types.length === 1 && bookType === "TRIAL"
          ? STUDENT_TRIAL.sheetTitle
          : "Book";

  function assertTypeReady() {
    if (bookType === "TRIAL" && slots.length > 0 && !sessionId) {
      throw new Error("Pick a trial slot");
    }
    if (bookType === "JOIN") {
      if (!target?.batchId && !klass?.id) throw new Error("Pick a class to join");
      if (plans.length > 0 && !planId) throw new Error("Pick a plan");
    }
    if (bookType === "PRIVATE") {
      if (!resolvedTrainerId) throw new Error("Pick a trainer");
      if (!branchId) throw new Error("Pick a floor");
      if (!startsLocal) throw new Error("Pick a time");
    }
    if (bookType === "FLOOR_HIRE") {
      if (!branchId) throw new Error("Pick a floor");
      if (!startsLocal) throw new Error("Pick a time");
    }
    if (bookType === "TRIAL" || bookType === "JOIN") {
      const blocked = childAudienceBlocked({ forChild, classAudience });
      if (blocked) throw new Error(blocked);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (needsAccount) {
        if (name.trim().length < 2) throw new Error("Enter your name");
        if (!validatePhone(phone)) throw new Error("Enter a valid phone number");
        if (!email.trim()) throw new Error("Enter your email");
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
      } else if (phone && !validatePhone(phone)) {
        throw new Error("Enter a valid phone number");
      }

      assertTypeReady();

      let studentId = user?.id;
      if (needsAccount) {
        const created = await signUp(email.trim(), password, name.trim(), {
          studioId,
        });
        studentId = created.id;
        try {
          await api.patch("/users/me", { phone: phone.trim() });
        } catch {
          /* notes still carry the phone */
        }
      }

      if (forChild) {
        if (childId) {
          studentId = childId;
        } else if (childName.trim()) {
          const created = await api.post<{ id: string }>(
            "/users/me/family-members",
            {
              name: childName.trim(),
              kind: "KID",
              studioId,
            },
          );
          studentId = created.id;
        } else {
          throw new Error("Enter your child's name");
        }
      }

      if (!studentId) throw new Error("Could not create your account");
      const notes = phone.trim() ? `Phone: ${phone.trim()}` : undefined;
      const startsAt = startsLocal ? new Date(startsLocal).toISOString() : undefined;
      const endsAt = startsAt ? addMinutes(startsAt, durationMinutes) : undefined;
      const resolvedStudio = studioId || target?.studioId || "";
      const trainerId = resolvedTrainerId || undefined;

      if (bookType === "JOIN") {
        const batchId = klass?.id ?? target?.batchId;
        if (!batchId || !planId) throw new Error("Pick a plan");
        const result = await api.post<{
          id?: string;
          billingKind?: string;
          invoice?: { id: string; status: string } | null;
        }>(`/batches/${batchId}/enroll`, {
          studentId,
          subscriptionId: planId,
        });
        const invoice = result.invoice;
        return {
          type: bookType,
          title: klass?.name ?? target?.className ?? studioName,
          when: null,
          place: studioName,
          status: invoice?.status === "PENDING" ? "AWAITING_PAYMENT" : "CONFIRMED",
          invoiceId: invoice?.id,
        } satisfies SuccessFact;
      }

      const created = await api.post<{
        id: string;
        status: string;
        startsAt?: string | null;
      }>("/bookings", {
        studioId: resolvedStudio,
        studentId,
        type: bookType,
        sessionId: bookType === "TRIAL" ? sessionId || undefined : undefined,
        trainerId: bookType === "PRIVATE" ? trainerId : undefined,
        branchId:
          bookType === "PRIVATE" || bookType === "FLOOR_HIRE"
            ? branchId || undefined
            : undefined,
        startsAt: bookType === "TRIAL" ? undefined : startsAt,
        endsAt: bookType === "TRIAL" ? undefined : endsAt,
        notes,
      });

      return {
        type: bookType,
        title:
          selectedSlot?.batchName ??
          klass?.name ??
          target?.className ??
          trainer?.name ??
          target?.trainerName ??
          studioName,
        when:
          selectedSlot?.startsAt ??
          created.startsAt ??
          startsAt ??
          null,
        place:
          branches.find((branch) => branch.id === branchId)?.name ??
          studioName,
        status: created.status,
        bookingId: created.id,
      } satisfies SuccessFact;
    },
    onSuccess: (fact) => {
      setSuccess(fact);
      setStep("success");
      setError(null);
    },
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not complete this booking",
      );
    },
  });

  const onGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle({ asNewStudent: true, studioId });
    } catch {
      setError("Google sign in failed");
    }
  };

  const goNext = () => {
    setError(null);
    try {
      assertTypeReady();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Check your booking");
      return;
    }
    if (needsAccount || !user) {
      setStep("account");
      return;
    }
    mutation.mutate();
  };

  return (
    <AppSheet
      isOpen={open}
      onOpenChange={onOpenChange}
      title={title}
      size="tall"
    >
      <div className={styles.body} data-testid="marketplace-book-sheet">
        {step === "success" && success ? (
          <div className={styles.success}>
            <SuccessState
              title={
                success.status === "AWAITING_PAYMENT"
                  ? "Pay to confirm"
                  : "Request sent"
              }
              description={marketplaceBookingStatusLabel(success.status)}
            />
            <dl className={styles.facts}>
              <dt>Type</dt>
              <dd>{bookTypeLabel(success.type)}</dd>
              <dt>For</dt>
              <dd>{success.title}</dd>
              {success.when ? (
                <>
                  <dt>When</dt>
                  <dd>{formatBookWhen(success.when)}</dd>
                </>
              ) : null}
              {success.place ? (
                <>
                  <dt>Where</dt>
                  <dd>{success.place}</dd>
                </>
              ) : null}
              <dt>Status</dt>
              <dd>{marketplaceBookingStatusLabel(success.status)}</dd>
            </dl>
            <div className={styles.actions}>
              <TouchButton
                variant="primary"
                fullWidth
                onClick={() => {
                  onOpenChange(false);
                  if (success.invoiceId) {
                    void navigate({
                      to: "/me/checkout/invoice/$invoiceId",
                      params: { invoiceId: success.invoiceId },
                    });
                    return;
                  }
                  if (success.bookingId && success.status === "AWAITING_PAYMENT") {
                    void navigate({
                      to: "/me/checkout/$bookingId",
                      params: { bookingId: success.bookingId },
                    });
                    return;
                  }
                  void navigate({ to: "/me/bookings" });
                }}
              >
                View booking
              </TouchButton>
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => onOpenChange(false)}
              >
                Back to class
              </TouchButton>
            </div>
          </div>
        ) : null}

        {step === "type" || step === "details" ? (
          <>
            <div className={styles.scroll}>
            <p className={styles.step} aria-live="polite">
              {types.length > 1 ? "Choose how to book" : STUDENT_TRIAL.stepSlot}
            </p>
            <p className={styles.recap}>{recap || studioName}</p>

            {types.length > 1 ? (
              <fieldset className={styles.fieldset}>
                <legend>Booking type</legend>
                <div className={styles.types}>
                  {types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={styles.choice}
                      data-testid={`book-type-${type.toLowerCase()}`}
                      data-active={bookType === type || undefined}
                      onClick={() => setBookType(type)}
                    >
                      <span className={styles.mark} aria-hidden>
                        {bookTypeLabel(type).slice(0, 1)}
                      </span>
                      <span className={styles.choiceCopy}>
                        <strong>{bookTypeLabel(type)}</strong>
                        <span>{bookTypeHint(type)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {bookType === "TRIAL" ? (
              <fieldset className={styles.fieldset}>
                <legend>{STUDENT_TRIAL.pickSlot}</legend>
                {slotsQuery.isLoading ? <SlotSkeleton /> : null}
                {slots.length === 0 && !slotsQuery.isLoading ? (
                  <p className={styles.hint}>{STUDENT_TRIAL.noSlots}</p>
                ) : null}
                {slotsQuery.isLoading ? null : (
                  <div className={styles.sections}>
                    {sections.map((section) => (
                      <div key={section.batchId} className={styles.section}>
                        {sections.length > 1 ? (
                          <p className={styles.sectionTitle}>{section.batchName}</p>
                        ) : null}
                        <div className={styles.slots}>
                          {section.slots.map((slot) => (
                            <button
                              key={slot.sessionId}
                              type="button"
                              className={styles.slot}
                              aria-label={[
                                section.batchName,
                                formatBookWhen(slot.startsAt),
                                slot.styleBadge,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                              data-active={
                                sessionId === slot.sessionId || undefined
                              }
                              onClick={() => setSessionId(slot.sessionId)}
                            >
                              <strong>{formatBookWhen(slot.startsAt)}</strong>
                              {slot.styleBadge ? <span>{slot.styleBadge}</span> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>
            ) : null}

            {bookType === "JOIN" ? (
              <fieldset className={styles.fieldset}>
                <legend>Plan</legend>
                {classQuery.isLoading ? <SlotSkeleton /> : null}
                {!classQuery.isLoading && plans.length === 0 ? (
                  <p className={styles.hint}>This class has no public plan yet.</p>
                ) : null}
                {classQuery.isLoading || plans.length === 0 ? null : (
                  <div className={styles.types}>
                    {plans.map((plan: MarketplaceClassPlan) => (
                      <button
                        key={plan.id || plan.name}
                        type="button"
                        className={styles.choice}
                        data-active={planId === plan.id || undefined}
                        onClick={() => setPlanId(plan.id)}
                      >
                        <span className={styles.choiceCopy}>
                          <strong>{plan.name}</strong>
                          <span>
                            {formatPriceFrom(plan.price, plan.cadence) ?? ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            ) : null}

            {showTrainerPicker ? (
              <fieldset className={styles.fieldset}>
                <legend>Trainer</legend>
                {privateTrainers.length === 0 ? (
                  <p className={styles.hint}>
                    No trainer is available for a private session at this studio.
                  </p>
                ) : (
                  <div className={styles.types}>
                    {privateTrainers.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.choice}
                        data-testid={`book-trainer-${item.id}`}
                        data-active={trainerPick === item.id || undefined}
                        onClick={() => setTrainerPick(item.id)}
                      >
                        {item.photoUrl ? (
                          <img
                            className={styles.avatar}
                            src={item.photoUrl}
                            alt=""
                          />
                        ) : (
                          <span className={styles.mark} aria-hidden>
                            {item.name.slice(0, 1)}
                          </span>
                        )}
                        <span className={styles.choiceCopy}>
                          <strong>{item.name}</strong>
                          {item.locality ? <span>{item.locality}</span> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            ) : null}

            {bookType === "PRIVATE" && privateStudios.length > 1 ? (
              <fieldset className={styles.fieldset}>
                <legend>Studio</legend>
                <div className={styles.types}>
                  {privateStudios.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles.choice}
                      data-active={studioPick === item.id || undefined}
                      onClick={() => {
                        setStudioPick(item.id);
                        setBranchId("");
                      }}
                    >
                      <span className={styles.choiceCopy}>
                        <strong>{item.name}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {bookType === "PRIVATE" || bookType === "FLOOR_HIRE" ? (
              <>
                <fieldset className={styles.fieldset}>
                  <legend>Floor</legend>
                  {branches.length === 0 ? (
                    <p className={styles.hint}>No open floor at this studio.</p>
                  ) : (
                    <div className={styles.types}>
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          className={styles.choice}
                          data-active={branchId === branch.id || undefined}
                          onClick={() => setBranchId(branch.id)}
                        >
                          <span className={styles.choiceCopy}>
                            <strong>{branch.name}</strong>
                            <span>{branch.address}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </fieldset>
                <fieldset className={styles.fieldset}>
                  <legend>Time</legend>
                  <div className={styles.when}>
                    <FormInput
                      label="Starts"
                      type="datetime-local"
                      value={startsLocal}
                      onChange={setStartsLocal}
                    />
                  </div>
                  <p className={styles.hint}>
                    {durationMinutes} minutes
                    {priceLabel ? ` · ${priceLabel}` : " · Studio confirms"}
                  </p>
                </fieldset>
              </>
            ) : null}

            {user ? (
              <fieldset className={styles.fieldset}>
                <legend>Who is this for</legend>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={forChild}
                    onChange={(event) => setForChild(event.target.checked)}
                  />
                  {STUDENT_TRIAL.childToggle}
                </label>
                {forChild && kids.length > 0 ? (
                  <div className={styles.types}>
                    {kids.map((kid) => (
                      <button
                        key={kid.id}
                        type="button"
                        className={styles.choice}
                        data-active={childId === kid.id || undefined}
                        onClick={() => {
                          setChildId(kid.id);
                          setChildName(kid.name);
                        }}
                      >
                        <span className={styles.choiceCopy}>
                          <strong>{kid.name}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {forChild ? (
                  <FormInput
                    label={STUDENT_TRIAL.childName}
                    value={childName}
                    onChange={(value) => {
                      setChildName(value);
                      setChildId("");
                    }}
                    autoComplete="off"
                  />
                ) : null}
              </fieldset>
            ) : null}

            </div>
            <div className={styles.footer}>
            {error ? <p className={styles.error}>{error}</p> : null}

            <TouchButton
              variant="primary"
              fullWidth
              onClick={goNext}
              isDisabled={
                (slotsQuery.isLoading && bookType === "TRIAL") ||
                (classQuery.isLoading && bookType === "JOIN")
              }
            >
              {user ? (bookType === "TRIAL" ? STUDENT_TRIAL.submit : "Book") : STUDENT_TRIAL.continue}
            </TouchButton>
            </div>
          </>
        ) : null}

        {step === "account" ? (
          <>
            <p className={styles.step} aria-live="polite">
              {STUDENT_TRIAL.stepRegister}
            </p>
            <p className={styles.recap}>{recap}</p>
            <fieldset ref={registerRef} className={styles.fieldset}>
              <legend>{STUDENT_TRIAL.yourDetails}</legend>
              {needsAccount ? (
                <FormInput
                  label={STUDENT_TRIAL.name}
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  required
                />
              ) : null}
              <FormInput
                label={STUDENT_TRIAL.phone}
                value={phone}
                onChange={setPhone}
                type="tel"
                autoComplete="tel"
                required
              />
              {needsAccount ? (
                <>
                  <FormInput
                    label={STUDENT_TRIAL.email}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    autoComplete="email"
                    required
                  />
                  <FormInput
                    label={STUDENT_TRIAL.password}
                    value={password}
                    onChange={setPassword}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </>
              ) : null}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={forChild}
                  onChange={(event) => setForChild(event.target.checked)}
                />
                {STUDENT_TRIAL.childToggle}
              </label>
              {forChild ? (
                <FormInput
                  label={STUDENT_TRIAL.childName}
                  value={childName}
                  onChange={setChildName}
                  autoComplete="off"
                />
              ) : null}
            </fieldset>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <TouchButton
                variant="primary"
                fullWidth
                onClick={() => {
                  setError(null);
                  mutation.mutate();
                }}
                isDisabled={mutation.isPending}
              >
                {bookType === "TRIAL" ? STUDENT_TRIAL.submit : "Book"}
              </TouchButton>
              {needsAccount ? (
                <TouchButton
                  variant="default"
                  fullWidth
                  onClick={() => void onGoogle()}
                >
                  {STUDENT_TRIAL.google}
                </TouchButton>
              ) : null}
              <TouchButton
                variant="quiet"
                fullWidth
                onClick={() => {
                  setError(null);
                  setStep("type");
                }}
              >
                {STUDENT_TRIAL.backStep}
              </TouchButton>
            </div>
          </>
        ) : null}
      </div>
    </AppSheet>
  );
}

export function TrialRequestSheet({
  open,
  onOpenChange,
  studioId,
  studioName,
  batchId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  studioName: string;
  batchId?: string | null;
}) {
  return (
    <BookSheet
      open={open}
      onOpenChange={onOpenChange}
      target={
        studioId
          ? {
              source: "studio",
              studioId,
              studioName,
              batchId,
              canTrial: true,
              canEnroll: Boolean(batchId),
              canPrivate: false,
              canFloorHire: false,
            }
          : null
      }
    />
  );
}

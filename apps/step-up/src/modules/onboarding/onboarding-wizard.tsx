import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useIsMobile } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  type AgeRange,
  type ExperienceLevel,
  type Gender,
  isAuthBypassEnabled,
} from "@/lib/constants";
import { resolveDisplayName } from "@/lib/display-name";
import { getFirebaseAuthAsync } from "@/lib/firebase";
import { useStudioId } from "@/lib/use-studio-id";
import { uploadSocialPhoto } from "@/modules/social/upload";
import { TrainerCardsView } from "@/modules/trainers/trainer-cards-view";
import { TrainerStackView } from "@/modules/trainers/trainer-stack-view";
import type { StudioTrainer } from "@/modules/trainers/types";
import {
  DateOfBirthOrAgeFields,
  hasAgeValue,
  resolveAgePayload,
} from "@/modules/ui/date-of-birth-or-age";
import { FormInput } from "@/modules/ui/form-input";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./onboarding.module.scss";
import {
  EXPERIENCE_LEVELS,
  GENDERS,
  ONBOARDING_STEPS,
  type OnboardingStep,
  STEP_META,
} from "./options";

type ProfilePatch = {
  name?: string;
  photoUrl?: string;
  experienceLevel?: ExperienceLevel;
  gender?: Gender;
  dateOfBirth?: string;
  age?: number;
  ageRange?: AgeRange;
  onboardingCompletedAt?: string | null;
};

type TrialSlot = {
  sessionId: string;
  batchId: string;
  batchName: string;
  styleBadge: string | null;
  startsAt: string;
  endsAt: string;
};

type SelectedTrial = { kind: "session"; slot: TrialSlot };

type CompleteOnboardingBody = {
  sessionId?: string;
  trainerId?: string;
};

const RING_SIZE = 68;
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatSlotWhen(startsAt: string) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return startsAt;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
}

function CircularNext({
  progress,
  disabled,
  onPress,
}: {
  progress: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  const offset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <button
      type="button"
      className={styles.circularNext}
      aria-label="Continue"
      disabled={disabled}
      onClick={onPress}
    >
      <svg
        className={styles.progressRing}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden
      >
        <title>Progress</title>
        <circle
          className={styles.progressRingTrack}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
        />
        <circle
          className={styles.progressRingValue}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.circularNextCore}>
        <Icon name="arrow-right" className={styles.circularNextIcon} />
      </span>
    </button>
  );
}

export function OnboardingWizard() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex] ?? "profile";
  const meta = STEP_META[step];
  const saveGeneration = useRef(0);

  const [name, setName] = useState(
    () => resolveDisplayName(user?.name, user?.email) ?? "",
  );
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    user?.photoUrl ?? null,
  );
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(user?.experienceLevel ?? null);
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [dateOfBirth, setDateOfBirth] = useState(() => user?.dateOfBirth ?? "");
  const [age, setAge] = useState(() =>
    user?.age !== null && user?.age !== undefined ? String(user.age) : "",
  );
  const [selectedTrial, setSelectedTrial] = useState<SelectedTrial | null>(
    null,
  );
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const slotsQuery = useQuery({
    queryKey: ["onboarding", "trial-slots", studioId],
    queryFn: () => api.get<TrialSlot[]>(`/sessions/studio/${studioId}/trial`),
    enabled: step === "trialTime" || step === "trainer",
  });

  const trainersQuery = useQuery({
    queryKey: ["onboarding", "trainers", studioId],
    queryFn: () =>
      api.get<StudioTrainer[]>(`/users/studio/${studioId}/trainers`),
    enabled: step === "trainer",
  });

  const trialSlots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const trainers = useMemo(
    () => trainersQuery.data ?? [],
    [trainersQuery.data],
  );

  const savePrefs = useMutation({
    mutationFn: (body: ProfilePatch) =>
      api.patch<ProfilePatch>("/users/me", body),
    onSuccess: (saved) => {
      updateUser({
        ...(saved.name ? { name: saved.name } : {}),
        ...(saved.photoUrl !== undefined ? { photoUrl: saved.photoUrl } : {}),
        ...(saved.experienceLevel !== undefined
          ? { experienceLevel: saved.experienceLevel }
          : {}),
        ...(saved.gender !== undefined ? { gender: saved.gender } : {}),
        ...(saved.dateOfBirth !== undefined
          ? { dateOfBirth: saved.dateOfBirth }
          : {}),
        ...(saved.age !== undefined ? { age: saved.age } : {}),
        ...(saved.ageRange !== undefined ? { ageRange: saved.ageRange } : {}),
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (body: CompleteOnboardingBody = {}) =>
      api.post<ProfilePatch>("/users/me/onboarding/complete", body),
  });

  function advanceTo(next: OnboardingStep) {
    const nextIndex = ONBOARDING_STEPS.indexOf(next);
    if (nextIndex >= 0) {
      setStepIndex(nextIndex);
    }
  }

  function persistInBackground(
    body: ProfilePatch,
    fromStep: number,
    extras?: { syncFirebaseName?: string },
  ) {
    const generation = ++saveGeneration.current;
    void savePrefs
      .mutateAsync(body)
      .then(async () => {
        if (generation !== saveGeneration.current) return;
        const displayName = extras?.syncFirebaseName;
        if (!displayName || isAuthBypassEnabled()) return;
        const auth = await getFirebaseAuthAsync();
        const firebaseUser = auth?.currentUser;
        if (firebaseUser && displayName !== firebaseUser.displayName) {
          const { updateProfile } = await import("firebase/auth");
          await updateProfile(firebaseUser, { displayName });
        }
      })
      .catch((err) => {
        if (generation !== saveGeneration.current) return;
        setStepIndex(fromStep);
        setError(err instanceof Error ? err.message : "Could not save");
      });
  }

  function goNext() {
    setError(null);
    const next = ONBOARDING_STEPS[stepIndex + 1];

    try {
      if (step === "profile") {
        if (!next) return;
        const trimmed = name.trim();
        if (!trimmed) {
          throw new Error("Add your name to continue");
        }
        if (!gender) {
          throw new Error("Choose Male or Female to continue");
        }
        if (!hasAgeValue({ dateOfBirth, age })) {
          throw new Error("Enter your date of birth or age");
        }
        const agePayload = resolveAgePayload({ dateOfBirth, age });
        updateUser({
          name: trimmed,
          gender,
          ...agePayload,
          ...(photoKey ? { photoUrl: photoKey } : {}),
        });
        advanceTo(next);
        persistInBackground(
          {
            name: trimmed,
            gender,
            ...agePayload,
            ...(photoKey ? { photoUrl: photoKey } : {}),
          },
          stepIndex,
          { syncFirebaseName: trimmed },
        );
        return;
      }

      if (step === "level") {
        if (!next) return;
        if (!experienceLevel) {
          throw new Error("Choose your experience level");
        }
        updateUser({ experienceLevel });
        advanceTo(next);
        persistInBackground({ experienceLevel }, stepIndex);
        return;
      }

      if (step === "trialTime") {
        if (!next) return;
        advanceTo(next);
        return;
      }

      if (step === "trainer") {
        void finishAndGo();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    }
  }

  async function finishAndGo(options?: {
    clearSlot?: boolean;
    clearTrainer?: boolean;
  }) {
    setError(null);
    const trial = options?.clearSlot ? null : selectedTrial;
    const trainerId = options?.clearTrainer ? null : selectedTrainerId;
    if (options?.clearSlot) setSelectedTrial(null);
    if (options?.clearTrainer) setSelectedTrainerId(null);
    try {
      if (!completed) {
        const body: CompleteOnboardingBody = {};
        if (trial?.kind === "session") {
          body.sessionId = trial.slot.sessionId;
        }
        if (trainerId) {
          body.trainerId = trainerId;
        }
        const saved =
          trial || trainerId
            ? await completeMutation.mutateAsync(body)
            : await completeMutation.mutateAsync({});
        // Flush auth before navigate so /me/book beforeLoad sees a completed
        // student (stale incomplete context would bounce back to onboarding).
        flushSync(() => {
          updateUser({
            onboardingCompletedAt: saved.onboardingCompletedAt
              ? String(saved.onboardingCompletedAt)
              : new Date().toISOString(),
          });
          setCompleted(true);
        });
      }
      // Session booking has a home timeline entry; otherwise open discover.
      if (trial?.kind === "session") {
        await navigate({ to: "/me", replace: true });
      } else {
        await navigate({
          to: "/me/book",
          search: { intent: "trial" },
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup");
    }
  }

  async function handleCropped(file: File) {
    setUploading(true);
    setError(null);
    try {
      const key = await uploadSocialPhoto(api, file, "avatar");
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoKey(key);
      setPhotoPreview(URL.createObjectURL(file));
      setPendingCrop(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  const finishing = completeMutation.isPending;
  const isOptionalStep = step === "trialTime" || step === "trainer";
  const isLast = step === "trainer";
  const ringProgress = (stepIndex + 1) / ONBOARDING_STEPS.length;

  return (
    <div className={styles.root} data-step={step}>
      <div className={styles.art}>
        <img
          key={meta.art}
          src={meta.art}
          alt=""
          className={styles.artImg}
          draggable={false}
        />
      </div>

      <div className={styles.copy}>
        <h1 className={styles.title}>
          {meta.title}{" "}
          <span className={styles.titleEmphasis}>{meta.emphasis}</span>
        </h1>
        <p className={styles.subtitle}>{meta.subtitle}</p>
      </div>

      <div className={styles.progress} aria-hidden>
        {ONBOARDING_STEPS.map((id, index) => (
          <span
            key={id}
            className={styles.progressDot}
            data-active={index === stepIndex ? "true" : undefined}
            data-complete={index < stepIndex ? "true" : undefined}
          />
        ))}
      </div>

      <div className={styles.body}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className={styles.stepEnter}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{
              duration: reducedMotion ? 0.15 : 0.22,
              ease: "easeOut",
            }}
          >
            {step === "profile" ? (
              <div className={styles.profileScroll}>
                <div className={styles.avatarRow}>
                  <Avatar size="lg" className={styles.avatar}>
                    {photoPreview ? (
                      <AvatarImage
                        src={photoPreview}
                        alt={name || user?.email || "You"}
                      />
                    ) : null}
                    <AvatarFallback>
                      {initials(
                        name || resolveDisplayName(null, user?.email) || "You",
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <FileTrigger
                    accept="image/jpeg,image/png,image/webp"
                    onSelect={(files) => {
                      const file = files?.[0];
                      if (file) setPendingCrop(file);
                    }}
                  >
                    <TouchButton variant="default" isDisabled={uploading}>
                      {photoPreview ? "Change photo" : "Add photo"}
                    </TouchButton>
                  </FileTrigger>
                </div>
                <FormInput
                  label="Display name"
                  type="text"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                />
                <div className={styles.profileSection}>
                  <p className={styles.sectionLabel}>Gender</p>
                  <div className={styles.chipRow}>
                    {GENDERS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={styles.styleChip}
                        data-selected={
                          gender === option.id ? "true" : undefined
                        }
                        onClick={() => setGender(option.id)}
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.profileSection}>
                  <DateOfBirthOrAgeFields
                    dateOfBirth={dateOfBirth}
                    onDateOfBirthChange={setDateOfBirth}
                    age={age}
                    onAgeChange={setAge}
                    hint="Enter either your date of birth or an exact age."
                  />
                </div>
              </div>
            ) : null}

            {step === "level" ? (
              <div className={styles.cardGrid}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className={styles.choiceCard}
                    data-selected={
                      experienceLevel === level.id ? "true" : undefined
                    }
                    onClick={() => setExperienceLevel(level.id)}
                  >
                    <p className={styles.choiceTitle}>{level.title}</p>
                    <p className={styles.choiceDescription}>
                      {level.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "trialTime" ? (
              <div className={styles.cardGrid}>
                {slotsQuery.isLoading ? (
                  <p className={styles.choiceDescription}>Loading times…</p>
                ) : null}
                {slotsQuery.isError ? (
                  <p className={styles.error}>Could not load class times.</p>
                ) : null}
                {!slotsQuery.isLoading &&
                !slotsQuery.isError &&
                trialSlots.length === 0 ? (
                  <p className={styles.choiceDescription}>
                    No upcoming class times yet — skip and browse classes.
                  </p>
                ) : null}
                {trialSlots.map((slot) => (
                  <button
                    key={slot.sessionId}
                    type="button"
                    className={styles.choiceCard}
                    data-selected={
                      selectedTrial?.kind === "session" &&
                      selectedTrial.slot.sessionId === slot.sessionId
                        ? "true"
                        : undefined
                    }
                    onClick={() =>
                      setSelectedTrial((current) =>
                        current?.kind === "session" &&
                        current.slot.sessionId === slot.sessionId
                          ? null
                          : { kind: "session", slot },
                      )
                    }
                  >
                    <p className={styles.choiceTitle}>
                      {formatSlotWhen(slot.startsAt)}
                    </p>
                    <p className={styles.choiceDescription}>
                      {slot.batchName}
                      {slot.styleBadge ? ` · ${slot.styleBadge}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "trainer" ? (
              <div className={styles.trainerPicker}>
                {trainersQuery.isLoading ? (
                  <p className={styles.choiceDescription}>Loading trainers…</p>
                ) : null}
                {trainersQuery.isError ? (
                  <p className={styles.error}>Could not load trainers.</p>
                ) : null}
                {!trainersQuery.isLoading &&
                !trainersQuery.isError &&
                trainers.length === 0 ? (
                  <p className={styles.choiceDescription}>
                    No trainers listed yet — skip to finish.
                  </p>
                ) : null}
                {trainers.length > 0 ? (
                  isMobile ? (
                    <TrainerStackView
                      trainers={trainers}
                      selectionMode
                      compact
                      selectedId={selectedTrainerId}
                      onSelect={setSelectedTrainerId}
                    />
                  ) : (
                    <TrainerCardsView
                      trainers={trainers}
                      selectionMode
                      selectedId={selectedTrainerId}
                      onSelect={setSelectedTrainerId}
                    />
                  )
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerBack}>
          {stepIndex > 0 ? (
            <TouchButton
              variant="quiet"
              onClick={() =>
                setStepIndex((current) => Math.max(0, current - 1))
              }
            >
              Back
            </TouchButton>
          ) : null}
        </div>
        <CircularNext
          progress={ringProgress}
          disabled={uploading || finishing}
          onPress={goNext}
        />
        <div className={styles.footerSkip}>
          {isOptionalStep ? (
            <TouchButton
              variant="quiet"
              isPending={finishing && isLast}
              onClick={() => {
                if (isLast) {
                  void finishAndGo({ clearTrainer: true });
                  return;
                }
                setSelectedTrial(null);
                const next = ONBOARDING_STEPS[stepIndex + 1];
                if (next) advanceTo(next);
              }}
            >
              Skip
            </TouchButton>
          ) : (
            <span className={styles.footerSpacer} aria-hidden />
          )}
        </div>
      </div>

      <ImageCropSheet
        file={pendingCrop}
        aspect={1}
        cropShape="round"
        title="Crop profile photo"
        busy={uploading}
        onCancel={() => setPendingCrop(null)}
        onCropDone={(file) => {
          void handleCropped(file);
        }}
      />
    </div>
  );
}

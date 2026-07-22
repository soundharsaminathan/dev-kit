import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { updateProfile } from "firebase/auth";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  type ExperienceLevel,
  isAuthBypassEnabled,
  STUDIO_ID,
} from "@/lib/constants";
import { DANCE_STYLES, resolveDanceStyle } from "@/lib/dance-styles";
import { getFirebaseAuth } from "@/lib/firebase";
import { coverUrl, type StudioBranch } from "@/modules/locations/types";
import { uploadSocialPhoto } from "@/modules/social/upload";
import { FormInput } from "@/modules/ui/form-input";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { SuccessState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./onboarding.module.scss";
import {
  EXPERIENCE_LEVELS,
  GOAL_PRESETS,
  ONBOARDING_STEPS,
  type OnboardingStep,
  SCHEDULE_VIBES,
  STEP_META,
} from "./options";

type ProfilePatch = {
  name?: string;
  photoUrl?: string;
  styles?: string[];
  experienceLevel?: ExperienceLevel;
  scheduleVibe?: string[];
  preferredBranchId?: string;
  onboardingCompletedAt?: string | null;
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
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex] ?? "profile";
  const meta = STEP_META[step];
  const saveGeneration = useRef(0);

  const [name, setName] = useState(
    user?.name && user.name !== "New User" ? user.name : "",
  );
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    user?.photoUrl ?? null,
  );
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);
  const [stylesSelected, setStylesSelected] = useState<string[]>(
    user?.styles ?? [],
  );
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(user?.experienceLevel ?? null);
  const [scheduleVibe, setScheduleVibe] = useState<string[]>(
    user?.scheduleVibe ?? [],
  );
  const [preferredBranchId, setPreferredBranchId] = useState<string | null>(
    user?.preferredBranchId ?? null,
  );
  const [goalTarget, setGoalTarget] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const selectedStyleLabels = new Set(
    stylesSelected.map((entry) => resolveDanceStyle(entry).label),
  );

  const branchesQuery = useQuery({
    queryKey: ["branches", STUDIO_ID, "onboarding"],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${STUDIO_ID}/branches`),
  });

  const savePrefs = useMutation({
    mutationFn: (body: ProfilePatch) =>
      api.patch<ProfilePatch>("/users/me", body),
    onSuccess: (saved) => {
      updateUser({
        ...(saved.name ? { name: saved.name } : {}),
        ...(saved.photoUrl !== undefined ? { photoUrl: saved.photoUrl } : {}),
        ...(saved.styles ? { styles: saved.styles } : {}),
        ...(saved.experienceLevel !== undefined
          ? { experienceLevel: saved.experienceLevel }
          : {}),
        ...(saved.scheduleVibe ? { scheduleVibe: saved.scheduleVibe } : {}),
        ...(saved.preferredBranchId !== undefined
          ? { preferredBranchId: saved.preferredBranchId }
          : {}),
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.put("/goals/me", { target: goalTarget });
      return api.post<ProfilePatch>("/users/me/onboarding/complete");
    },
    onSuccess: (saved) => {
      updateUser({
        onboardingCompletedAt: saved.onboardingCompletedAt
          ? String(saved.onboardingCompletedAt)
          : new Date().toISOString(),
      });
      setCompleted(true);
    },
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
        const auth = getFirebaseAuth();
        const firebaseUser = auth?.currentUser;
        if (firebaseUser && displayName !== firebaseUser.displayName) {
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
    if (!next) return;

    try {
      if (step === "profile") {
        const trimmed = name.trim();
        if (!trimmed) {
          throw new Error("Add your name to continue");
        }
        updateUser({
          name: trimmed,
          ...(photoKey ? { photoUrl: photoKey } : {}),
        });
        advanceTo(next);
        persistInBackground(
          {
            name: trimmed,
            ...(photoKey ? { photoUrl: photoKey } : {}),
          },
          stepIndex,
          { syncFirebaseName: trimmed },
        );
        return;
      }

      if (step === "styles") {
        if (stylesSelected.length < 1) {
          throw new Error("Pick at least one dance style");
        }
        updateUser({ styles: stylesSelected });
        advanceTo(next);
        persistInBackground({ styles: stylesSelected }, stepIndex);
        return;
      }

      if (step === "level") {
        if (!experienceLevel) {
          throw new Error("Choose your experience level");
        }
        updateUser({ experienceLevel });
        advanceTo(next);
        persistInBackground({ experienceLevel }, stepIndex);
        return;
      }

      if (step === "vibe") {
        if (scheduleVibe.length < 1) {
          throw new Error("Pick at least one schedule vibe");
        }
        updateUser({ scheduleVibe });
        advanceTo(next);
        persistInBackground({ scheduleVibe }, stepIndex);
        return;
      }

      if (step === "branch") {
        if (!preferredBranchId) {
          throw new Error("Choose your preferred studio location");
        }
        updateUser({ preferredBranchId });
        advanceTo(next);
        persistInBackground({ preferredBranchId }, stepIndex);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    }
  }

  async function finishAndGo(intent: "trial" | "discover") {
    setError(null);
    try {
      if (!completed) {
        await completeMutation.mutateAsync();
      }
      const branchId = preferredBranchId ?? undefined;
      const primaryStyle = stylesSelected[0];
      void navigate({
        to: "/me/book",
        search: {
          ...(branchId ? { branchId } : {}),
          ...(primaryStyle ? { style: primaryStyle } : {}),
          ...(intent === "trial" ? { intent: "trial" } : {}),
        },
        replace: true,
      });
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

  function toggleStyle(label: string) {
    const next = new Set(selectedStyleLabels);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    setStylesSelected(
      DANCE_STYLES.filter((style) => next.has(style.label)).map(
        (style) => style.label,
      ),
    );
  }

  function toggleVibe(id: string) {
    setScheduleVibe((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  const finishing = completeMutation.isPending;
  const isLast = step === "celebrate";
  const ringProgress = (stepIndex + 1) / ONBOARDING_STEPS.length;

  return (
    <div className={styles.root}>
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
              <>
                <div className={styles.avatarRow}>
                  <Avatar size="lg" className={styles.avatar}>
                    {photoPreview ? (
                      <AvatarImage src={photoPreview} alt={name || "You"} />
                    ) : null}
                    <AvatarFallback>{initials(name || "You")}</AvatarFallback>
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
              </>
            ) : null}

            {step === "styles" ? (
              <div className={styles.styleChips}>
                {DANCE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={styles.styleChip}
                    data-selected={
                      selectedStyleLabels.has(style.label) ? "true" : undefined
                    }
                    aria-pressed={selectedStyleLabels.has(style.label)}
                    onClick={() => toggleStyle(style.label)}
                  >
                    <span className={styles.styleChipEmoji} aria-hidden>
                      {style.emoji}
                    </span>
                    {style.label}
                  </button>
                ))}
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

            {step === "vibe" ? (
              <div className={styles.cardGrid}>
                {SCHEDULE_VIBES.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    className={styles.choiceCard}
                    data-selected={
                      scheduleVibe.includes(vibe.id) ? "true" : undefined
                    }
                    onClick={() => toggleVibe(vibe.id)}
                  >
                    <p className={styles.choiceTitle}>{vibe.label}</p>
                    <p className={styles.choiceDescription}>
                      {vibe.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "branch" ? (
              <div className={styles.branchList}>
                {branchesQuery.isLoading ? (
                  <SkeletonCardList count={2} />
                ) : null}
                {branchesQuery.data?.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    className={styles.branchCard}
                    data-selected={
                      preferredBranchId === branch.id ? "true" : undefined
                    }
                    onClick={() => setPreferredBranchId(branch.id)}
                  >
                    <p className={styles.branchName}>{branch.name}</p>
                    <p className={styles.branchAddress}>{branch.address}</p>
                    {coverUrl(branch) ? (
                      <span className={styles.choiceDescription}>
                        Tap to make this your home studio
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {step === "celebrate" ? (
              <div className={styles.celebrate}>
                <SuccessState
                  title="Your floor is ready"
                  description="Classes will lean into your styles, level, and schedule."
                />
                <p className={styles.choiceDescription}>
                  How many sessions do you want this month?
                </p>
                <div className={styles.goalGrid}>
                  {GOAL_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={styles.goalChip}
                      data-selected={goalTarget === value ? "true" : undefined}
                      onClick={() => setGoalTarget(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className={styles.exitActions}>
                  <TouchButton
                    variant="primary"
                    fullWidth
                    isPending={finishing}
                    onClick={() => void finishAndGo("trial")}
                  >
                    Book a free trial
                  </TouchButton>
                  <TouchButton
                    variant="default"
                    fullWidth
                    isPending={finishing}
                    onClick={() => void finishAndGo("discover")}
                  >
                    Explore classes
                  </TouchButton>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {!isLast ? (
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
            disabled={uploading}
            onPress={goNext}
          />
          <span className={styles.footerSpacer} aria-hidden />
        </div>
      ) : null}

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

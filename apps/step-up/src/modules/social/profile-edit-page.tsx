import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import {
  Description,
  Field,
  FieldError,
  Label,
} from "@dev-ui/components/field";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Input } from "@dev-ui/components/input";
import { Switch } from "@dev-ui/components/switch";
import { TextArea } from "@dev-ui/components/text-area";
import { TextField } from "@dev-ui/components/text-field";
import { Icon } from "@dev-ui/icons";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { updateProfile } from "firebase/auth";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import {
  type AgeRange,
  type ExperienceLevel,
  type Gender,
  isAuthBypassEnabled,
  STUDIO_ID,
} from "@/lib/constants";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  AGE_RANGES,
  EXPERIENCE_LEVELS,
  GENDERS,
  SCHEDULE_VIBES,
} from "@/modules/onboarding/options";
import { InstallAppPanel } from "@/modules/pwa/install-app-panel";
import { StylePicker } from "@/modules/styles/style-picker";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import styles from "./profile-edit-page.module.scss";
import type { SocialProfile } from "./types";
import { uploadSocialPhoto } from "./upload";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const BIO_MAX = 280;

type ProfileImageKind = "avatar" | "banner" | "cover";

type ProfileImageState = {
  value: string | null;
  preview: string | null;
};

const CROP_CONFIG: Record<
  ProfileImageKind,
  { aspect: number; cropShape: "rect" | "round"; title: string }
> = {
  avatar: { aspect: 1, cropShape: "round", title: "Crop profile photo" },
  banner: { aspect: 4 / 5, cropShape: "rect", title: "Crop poster" },
  cover: { aspect: 3, cropShape: "rect", title: "Crop cover photo" },
};

type ProfileFormValues = {
  name: string;
  phone: string;
  bio: string;
  instagramUrl: string;
  isPublic: boolean;
  styles: string[];
  experienceLevel: ExperienceLevel | "";
  scheduleVibe: string[];
  gender: Gender | "";
  ageRange: AgeRange | "";
  preferredBranchId: string;
};

type ProfileEditPageProps = {
  backTo?: string;
};

function validateInstagramUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    new URL(withProtocol);
    return undefined;
  } catch {
    return "Enter a valid URL";
  }
}

function normalizeInstagramUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ProfileEditPage({ backTo = "/me" }: ProfileEditPageProps) {
  const api = useApi();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<SocialProfile>(`/users/${userId}/profile`),
    enabled: Boolean(userId),
  });

  if (profileQuery.isLoading) {
    return (
      <Screen title="Edit profile" showBack backTo={backTo}>
        <div className={styles.root}>
          <div className={styles.hero}>
            <SkeletonBlock height="6.5rem" width="6.5rem" radius="999px" />
            <SkeletonBlock height="0.875rem" width="10rem" />
          </div>
          <SkeletonBlock height="12rem" radius="var(--radius-2xl)" />
          <SkeletonBlock height="5rem" radius="var(--radius-2xl)" />
          <SkeletonBlock height="8rem" radius="var(--radius-2xl)" />
        </div>
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Screen title="Edit profile" showBack backTo={backTo}>
        <ErrorState
          description={
            profileQuery.error instanceof Error
              ? profileQuery.error.message
              : "Could not load your profile."
          }
          action={
            <TouchButton
              variant="primary"
              onClick={() => profileQuery.refetch()}
            >
              Try again
            </TouchButton>
          }
        />
      </Screen>
    );
  }

  return <ProfileEditForm backTo={backTo} profile={profileQuery.data} />;
}

type ProfileEditFormProps = {
  backTo: string;
  profile: SocialProfile;
};

function ProfileEditForm({ backTo, profile }: ProfileEditFormProps) {
  const api = useApi();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id ?? profile.id;

  const [images, setImages] = useState<
    Record<ProfileImageKind, ProfileImageState>
  >({
    avatar: {
      value: profile.photoUrl ?? null,
      preview: profile.photoUrl ?? null,
    },
    banner: {
      value: profile.bannerUrl ?? null,
      preview: profile.bannerUrl ?? null,
    },
    cover: {
      value: profile.coverUrl ?? null,
      preview: profile.coverUrl ?? null,
    },
  });
  const [pendingCrop, setPendingCrop] = useState<{
    file: File;
    kind: ProfileImageKind;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canToggleVisibility =
    user?.role === "STUDENT" || user?.role === "PARENT";
  const canEditStyles = user?.role === "TRAINER" || user?.role === "STUDENT";
  const canEditPrefs = user?.role === "STUDENT";

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const trimmedName = values.name.trim();
      const saved = await api.patch<{
        name: string;
        phone?: string | null;
        bio?: string | null;
        photoUrl?: string | null;
        bannerUrl?: string | null;
        coverUrl?: string | null;
        instagramUrl?: string | null;
        styles?: string[];
        experienceLevel?: ExperienceLevel | null;
        scheduleVibe?: string[];
        gender?: Gender | null;
        ageRange?: AgeRange | null;
        preferredBranchId?: string | null;
      }>("/users/me", {
        name: trimmedName,
        phone: values.phone.trim() || null,
        bio: values.bio.trim(),
        ...(images.avatar.value ? { photoUrl: images.avatar.value } : {}),
        ...(images.banner.value ? { bannerUrl: images.banner.value } : {}),
        ...(images.cover.value ? { coverUrl: images.cover.value } : {}),
        ...(normalizeInstagramUrl(values.instagramUrl)
          ? { instagramUrl: normalizeInstagramUrl(values.instagramUrl) }
          : {}),
        ...(canEditStyles ? { styles: values.styles } : {}),
        gender: values.gender || undefined,
        ageRange: values.ageRange || undefined,
        ...(canEditPrefs
          ? {
              experienceLevel: values.experienceLevel || undefined,
              scheduleVibe: values.scheduleVibe,
              preferredBranchId: values.preferredBranchId || null,
            }
          : {}),
        profileVisibility: values.isPublic ? "PUBLIC" : "PRIVATE",
      });

      if (!isAuthBypassEnabled()) {
        const auth = getFirebaseAuth();
        const firebaseUser = auth?.currentUser;
        if (
          firebaseUser &&
          trimmedName &&
          trimmedName !== firebaseUser.displayName
        ) {
          await updateProfile(firebaseUser, { displayName: trimmedName });
        }
      }

      return saved;
    },
    onSuccess: async (saved) => {
      updateUser({
        name: saved.name,
        bio: saved.bio ?? null,
        photoUrl: saved.photoUrl ?? null,
        instagramUrl: saved.instagramUrl ?? null,
        ...(saved.styles ? { styles: saved.styles } : {}),
        ...(saved.experienceLevel !== undefined
          ? { experienceLevel: saved.experienceLevel }
          : {}),
        ...(saved.scheduleVibe ? { scheduleVibe: saved.scheduleVibe } : {}),
        ...(saved.gender !== undefined ? { gender: saved.gender } : {}),
        ...(saved.ageRange !== undefined ? { ageRange: saved.ageRange } : {}),
        ...(saved.preferredBranchId !== undefined
          ? { preferredBranchId: saved.preferredBranchId }
          : {}),
      });
      setSaveMessage("Profile saved.");
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      await queryClient.invalidateQueries({
        queryKey: ["studio-trainers", STUDIO_ID],
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: profile.name,
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
      instagramUrl: profile.instagramUrl ?? "",
      isPublic: profile.profileVisibility === "PUBLIC",
      styles: profile.styles,
      experienceLevel: user?.experienceLevel ?? "",
      scheduleVibe: user?.scheduleVibe ?? [],
      gender: user?.gender ?? "",
      ageRange: user?.ageRange ?? "",
      preferredBranchId: user?.preferredBranchId ?? "",
    } satisfies ProfileFormValues,
    onSubmit: async ({ value }) => {
      setSaveMessage(null);
      if (!value.gender) {
        setSaveMessage("Choose Male or Female to continue.");
        return;
      }
      if (!value.ageRange) {
        setSaveMessage("Choose an age range to continue.");
        return;
      }
      try {
        await saveMutation.mutateAsync(value);
      } catch (err) {
        setSaveMessage(
          err instanceof Error ? err.message : "Could not save profile.",
        );
      }
    },
  });

  const branchesQuery = useQuery({
    queryKey: ["branches", STUDIO_ID, "profile-edit"],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; address: string }>>(
        `/studios/${STUDIO_ID}/branches`,
      ),
    enabled: canEditPrefs,
  });

  function handleSelect(kind: ProfileImageKind, files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file.");
      return;
    }
    setUploadError(null);
    setPendingCrop({ file, kind });
  }

  async function handleCropped(kind: ProfileImageKind, file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const key = await uploadSocialPhoto(api, file, "avatar");
      setImages((current) => {
        const previous = current[kind].preview;
        if (previous?.startsWith("blob:")) {
          URL.revokeObjectURL(previous);
        }
        return {
          ...current,
          [kind]: { value: key, preview: URL.createObjectURL(file) },
        };
      });
      setPendingCrop(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not upload photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Screen
        title="Edit profile"
        subtitle="Photo, bio, and privacy"
        showBack
        backTo={backTo}
        paddedCta
        actions={
          <TouchButton
            variant="quiet"
            size="sm"
            onClick={() => {
              void navigate({ to: "/users/$id", params: { id: userId } });
            }}
          >
            View
          </TouchButton>
        }
      >
        <form
          className={styles.root}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <InstallAppPanel />

          <section className={styles.hero} aria-label="Profile photo">
            <div className={styles.avatarRing}>
              <form.Subscribe selector={(state) => state.values.name}>
                {(name) => (
                  <Avatar size="lg" className={styles.avatar}>
                    {images.avatar.preview ? (
                      <AvatarImage src={images.avatar.preview} alt={name} />
                    ) : null}
                    <AvatarFallback>{name.slice(0, 1) || "?"}</AvatarFallback>
                  </Avatar>
                )}
              </form.Subscribe>
              <FileTrigger
                accept={ACCEPTED_IMAGE_TYPES}
                onSelect={(files) => handleSelect("avatar", files)}
              >
                <TouchButton
                  variant="primary"
                  size="sm"
                  className={styles.cameraBtn}
                  aria-label="Change photo"
                  isPending={uploading}
                  type="button"
                >
                  <Icon name="camera" />
                </TouchButton>
              </FileTrigger>
            </div>
            <p className={styles.heroHint}>
              Tap the camera to update your photo
            </p>
          </section>

          {uploadError ? (
            <p
              className={`${styles.message} ${styles.messageError}`}
              role="alert"
            >
              {uploadError}
            </p>
          ) : null}

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Photos</h2>
              <p className={styles.cardDesc}>
                Cover spans the top of your profile. Poster is the tall image on
                cards and discovery.
              </p>
            </header>

            <div className={styles.imageField}>
              <div className={styles.imageLabelRow}>
                <span className={styles.imageLabel}>Cover</span>
                <span className={styles.imageHint}>3:1 wide</span>
              </div>
              <div className={`${styles.imagePreview} ${styles.coverPreview}`}>
                {images.cover.preview ? (
                  <img src={images.cover.preview} alt="Cover" />
                ) : (
                  <span className={styles.imageEmpty}>
                    <Icon name="image" />
                    No cover yet
                  </span>
                )}
                <FileTrigger
                  accept={ACCEPTED_IMAGE_TYPES}
                  onSelect={(files) => handleSelect("cover", files)}
                >
                  <TouchButton
                    variant="primary"
                    size="sm"
                    className={styles.imageAction}
                    isPending={uploading}
                    type="button"
                  >
                    <Icon name="camera" />
                    {images.cover.preview ? "Change" : "Upload"}
                  </TouchButton>
                </FileTrigger>
              </div>
            </div>

            <div className={styles.imageField}>
              <div className={styles.imageLabelRow}>
                <span className={styles.imageLabel}>Poster</span>
                <span className={styles.imageHint}>4:5 tall</span>
              </div>
              <div className={`${styles.imagePreview} ${styles.bannerPreview}`}>
                {images.banner.preview ? (
                  <img src={images.banner.preview} alt="Poster" />
                ) : (
                  <span className={styles.imageEmpty}>
                    <Icon name="image" />
                    No poster yet
                  </span>
                )}
                <FileTrigger
                  accept={ACCEPTED_IMAGE_TYPES}
                  onSelect={(files) => handleSelect("banner", files)}
                >
                  <TouchButton
                    variant="primary"
                    size="sm"
                    className={styles.imageAction}
                    isPending={uploading}
                    type="button"
                  >
                    <Icon name="camera" />
                    {images.banner.preview ? "Change" : "Upload"}
                  </TouchButton>
                </FileTrigger>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>About you</h2>
              <p className={styles.cardDesc}>How you show up across Step Up.</p>
            </header>

            <div className={styles.fieldStack}>
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return "Name is required";
                    }
                    if (trimmed.length < 2) {
                      return "Name must be at least 2 characters";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <TextField>
                      <Label data-required="true">Name</Label>
                      <Input
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={Boolean(error)}
                        autoComplete="name"
                        placeholder="Your display name"
                        required
                      />
                      {error ? <FieldError>{error}</FieldError> : null}
                    </TextField>
                  );
                }}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <TextField>
                    <Label>Phone</Label>
                    <Input
                      name={field.name}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="+91 98765 43210"
                    />
                  </TextField>
                )}
              </form.Field>

              <form.Field
                name="bio"
                validators={{
                  onChange: ({ value }) =>
                    value.length > BIO_MAX
                      ? `Bio must be ${BIO_MAX} characters or less`
                      : undefined,
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  const remaining = BIO_MAX - field.state.value.length;
                  return (
                    <Field>
                      <Label>Bio</Label>
                      <TextArea
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={Boolean(error)}
                        rows={4}
                        placeholder="Tell people about yourself"
                        maxLength={BIO_MAX}
                      />
                      <Description>
                        {remaining} character{remaining === 1 ? "" : "s"} left
                      </Description>
                      {error ? <FieldError>{error}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field
                name="instagramUrl"
                validators={{
                  onChange: ({ value }) => validateInstagramUrl(value),
                  onBlur: ({ value }) => validateInstagramUrl(value),
                }}
              >
                {(field) => {
                  const error = field.state.meta.errors[0];
                  return (
                    <TextField>
                      <Label>Instagram</Label>
                      <Input
                        name={field.name}
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={Boolean(error)}
                        placeholder="instagram.com/yourhandle"
                      />
                      <Description>Optional public profile link</Description>
                      {error ? <FieldError>{error}</FieldError> : null}
                    </TextField>
                  );
                }}
              </form.Field>

              {canEditStyles ? (
                <form.Field name="styles">
                  {(field) => (
                    <div className={styles.stylesBlock}>
                      <div className={styles.stylesHeader}>
                        <h3 className={styles.stylesTitle}>Dance styles</h3>
                        <p className={styles.cardDesc}>
                          {user?.role === "TRAINER"
                            ? "Shown on your trainer profile and cards."
                            : "Powers your Discover recommendations."}
                        </p>
                      </div>
                      <StylePicker
                        value={field.state.value}
                        onChange={(next) => field.handleChange(next)}
                      />
                    </div>
                  )}
                </form.Field>
              ) : null}

              <form.Field name="gender">
                {(field) => (
                  <div className={styles.stylesBlock}>
                    <div className={styles.stylesHeader}>
                      <h3 className={styles.stylesTitle}>Gender</h3>
                      <p className={styles.cardDesc}>Required</p>
                    </div>
                    <div className={styles.prefGrid}>
                      {GENDERS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={styles.prefChip}
                          data-selected={
                            field.state.value === option.id ? "true" : undefined
                          }
                          onClick={() => field.handleChange(option.id)}
                        >
                          {option.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name="ageRange">
                {(field) => (
                  <div className={styles.stylesBlock}>
                    <div className={styles.stylesHeader}>
                      <h3 className={styles.stylesTitle}>Age range</h3>
                      <p className={styles.cardDesc}>Required</p>
                    </div>
                    <div className={styles.prefGrid}>
                      {AGE_RANGES.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={styles.prefChip}
                          data-selected={
                            field.state.value === option.id ? "true" : undefined
                          }
                          onClick={() => field.handleChange(option.id)}
                        >
                          {option.label} · {option.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form.Field>

              {canEditPrefs ? (
                <>
                  <form.Field name="experienceLevel">
                    {(field) => (
                      <div className={styles.stylesBlock}>
                        <div className={styles.stylesHeader}>
                          <h3 className={styles.stylesTitle}>Experience</h3>
                        </div>
                        <div className={styles.prefGrid}>
                          {EXPERIENCE_LEVELS.map((level) => (
                            <button
                              key={level.id}
                              type="button"
                              className={styles.prefChip}
                              data-selected={
                                field.state.value === level.id
                                  ? "true"
                                  : undefined
                              }
                              onClick={() => field.handleChange(level.id)}
                            >
                              {level.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="scheduleVibe">
                    {(field) => (
                      <div className={styles.stylesBlock}>
                        <div className={styles.stylesHeader}>
                          <h3 className={styles.stylesTitle}>Schedule vibe</h3>
                        </div>
                        <div className={styles.prefGrid}>
                          {SCHEDULE_VIBES.map((vibe) => {
                            const selected = field.state.value.includes(
                              vibe.id,
                            );
                            return (
                              <button
                                key={vibe.id}
                                type="button"
                                className={styles.prefChip}
                                data-selected={selected ? "true" : undefined}
                                onClick={() =>
                                  field.handleChange(
                                    selected
                                      ? field.state.value.filter(
                                          (entry) => entry !== vibe.id,
                                        )
                                      : [...field.state.value, vibe.id],
                                  )
                                }
                              >
                                {vibe.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="preferredBranchId">
                    {(field) => (
                      <div className={styles.stylesBlock}>
                        <div className={styles.stylesHeader}>
                          <h3 className={styles.stylesTitle}>
                            Preferred location
                          </h3>
                        </div>
                        <div className={styles.prefGrid}>
                          {(branchesQuery.data ?? []).map((branch) => (
                            <button
                              key={branch.id}
                              type="button"
                              className={styles.prefChip}
                              data-selected={
                                field.state.value === branch.id
                                  ? "true"
                                  : undefined
                              }
                              onClick={() => field.handleChange(branch.id)}
                            >
                              {branch.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </form.Field>
                </>
              ) : null}
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Privacy</h2>
            </header>

            {canToggleVisibility ? (
              <form.Field name="isPublic">
                {(field) => (
                  <div className={styles.privacyRow}>
                    <span className={styles.privacyIcon} aria-hidden>
                      <Icon name={field.state.value ? "globe" : "lock"} />
                    </span>
                    <div className={styles.privacyText}>
                      <span className={styles.privacyTitle}>
                        Public profile
                      </span>
                      <span className={styles.privacyDesc}>
                        {field.state.value
                          ? "Anyone can find and follow you"
                          : "Only people you approve can follow you"}
                      </span>
                    </div>
                    <Switch
                      isSelected={field.state.value}
                      onChange={(next) => field.handleChange(next)}
                      aria-label="Public profile"
                    />
                  </div>
                )}
              </form.Field>
            ) : (
              <div className={styles.privacyRow}>
                <span className={styles.privacyIcon} aria-hidden>
                  <Icon name="globe" />
                </span>
                <div className={styles.privacyText}>
                  <span className={styles.privacyTitle}>Always public</span>
                  <span className={styles.privacyDesc}>
                    Trainer and staff profiles stay public.
                  </span>
                </div>
              </div>
            )}
          </section>

          {saveMessage ? (
            <p
              className={`${styles.message} ${
                saveMutation.isError || saveMessage !== "Profile saved."
                  ? styles.messageError
                  : styles.messageSuccess
              }`}
              role="status"
            >
              {saveMessage}
            </p>
          ) : null}
        </form>
      </Screen>

      <StickyCtaBar>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <TouchButton
              type="button"
              variant="primary"
              fullWidth
              isPending={isSubmitting}
              isDisabled={!canSubmit}
              onClick={() => void form.handleSubmit()}
            >
              Save profile
            </TouchButton>
          )}
        </form.Subscribe>
      </StickyCtaBar>

      <ImageCropSheet
        file={pendingCrop?.file ?? null}
        aspect={pendingCrop ? CROP_CONFIG[pendingCrop.kind].aspect : 1}
        cropShape={
          pendingCrop ? CROP_CONFIG[pendingCrop.kind].cropShape : "rect"
        }
        title={pendingCrop ? CROP_CONFIG[pendingCrop.kind].title : "Crop"}
        busy={uploading}
        onCancel={() => setPendingCrop(null)}
        onCropDone={(file) => {
          if (pendingCrop) {
            void handleCropped(pendingCrop.kind, file);
          }
        }}
      />
    </>
  );
}

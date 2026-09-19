import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from "@dev-ui/components/disclosure";
import { Input } from "@dev-ui/components/input";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import { TextArea } from "@dev-ui/components/text-area";
import { Icon, type IconName } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import { BrandingPanel } from "@/modules/branding/branding-panel";
import { BranchMap } from "@/modules/locations/branch-map";
import {
  coverUrl,
  type MapCoordinates,
  type StudioBranch,
} from "@/modules/locations/types";
import { DanceStylesEditor } from "./studio-dance-styles-editor";
import {
  ABOUT_MAX,
  countryFlag,
  foundedYearOptions,
  joinPhone,
  nextSocialToAdd,
  PHONE_COUNTRIES,
  type PhoneCountryIso,
  type ProfileValues,
  type SocialKey,
  splitPhone,
  TAGLINE_MAX,
  TRIAL_MAX,
  visibleSocials,
  WHAT_TO_BRING_MAX,
} from "./studio-profile-model";
import {
  StudioProfileCompletion,
  StudioProfilePreview,
} from "./studio-profile-preview";
import styles from "./studio-profile-workspace.module.scss";
import type { Studio } from "./types";
import { SettingsSaveBar } from "./ui";
import { useStudioDanceStyles } from "./use-studio-dance-styles";

type StudioProfileWorkspaceProps = {
  studio: Studio;
  branch: StudioBranch | null;
  values: ProfileValues;
  coordinates: MapCoordinates | null;
  setField: <K extends keyof ProfileValues>(
    key: K,
    value: ProfileValues[K],
  ) => void;
  onCoordinatesChange: (value: MapCoordinates) => void;
  resolveMapLink: (url: string) => Promise<string>;
  isDirty: boolean;
  isPending: boolean;
  isOwner: boolean;
  saveError?: string | null;
  onSave: () => void;
  onDiscard: () => void;
  completion: {
    percent: number;
    items: Array<{ id: string; label: string; done: boolean }>;
  };
};

const SOCIAL_META: Record<
  SocialKey,
  { label: string; icon: IconName; placeholder: string }
> = {
  instagram: {
    label: "Instagram",
    icon: "heart",
    placeholder: "@studio",
  },
  youtube: {
    label: "YouTube",
    icon: "monitor",
    placeholder: "https://youtube.com/@studio",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: "message-square",
    placeholder: "+91 98765 43210",
  },
};

function ProfileField({
  label,
  hint,
  required,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <p className={styles.fieldLabel}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </p>
        {counter ? <p className={styles.counter}>{counter}</p> : null}
      </div>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {children}
    </div>
  );
}

function PhoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = splitPhone(value);

  return (
    <div className={styles.phoneRow}>
      <label className={styles.srOnly} htmlFor="studio-phone-country">
        Country
      </label>
      <select
        id="studio-phone-country"
        className={styles.country}
        value={parsed.iso}
        onChange={(event) =>
          onChange(
            joinPhone(event.target.value as PhoneCountryIso, parsed.national),
          )
        }
      >
        {PHONE_COUNTRIES.map((country) => (
          <option key={country.iso} value={country.iso}>
            {countryFlag(country.iso)} {country.dial}
          </option>
        ))}
      </select>
      <InputGroup>
        <InputGroupAddon>
          <Icon name="phone-call" />
        </InputGroupAddon>
        <Input
          value={parsed.national}
          onChange={(event) =>
            onChange(joinPhone(parsed.iso, event.target.value))
          }
          inputMode="tel"
          autoComplete="tel-national"
          aria-label="Phone number"
        />
      </InputGroup>
    </div>
  );
}

function SocialField({
  social,
  value,
  onChange,
}: {
  social: SocialKey;
  value: string;
  onChange: (value: string) => void;
}) {
  const meta = SOCIAL_META[social];
  return (
    <ProfileField label={meta.label}>
      <InputGroup>
        <InputGroupAddon>
          <Icon name={meta.icon} />
        </InputGroupAddon>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={social === "whatsapp" ? "tel" : "url"}
          placeholder={meta.placeholder}
        />
      </InputGroup>
    </ProfileField>
  );
}

function OptionalSection({
  title,
  description,
  status,
  complete,
  children,
}: {
  title: string;
  description: string;
  status: string;
  complete?: boolean;
  children: ReactNode;
}) {
  return (
    <Disclosure className={styles.expandable}>
      <DisclosureTrigger className={styles.expandTrigger}>
        <span className={styles.expandCopy}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardHint}>{description}</span>
        </span>
        <span
          className={styles.expandStatus}
          data-complete={complete ? "true" : undefined}
        >
          {status}
        </span>
      </DisclosureTrigger>
      <DisclosurePanel className={styles.expandPanel} mountWhen="expanded-once">
        {children}
      </DisclosurePanel>
    </Disclosure>
  );
}

export function StudioProfileWorkspace({
  studio,
  branch,
  values,
  coordinates,
  setField,
  onCoordinatesChange,
  resolveMapLink,
  isDirty,
  isPending,
  isOwner,
  saveError,
  onSave,
  onDiscard,
  completion,
}: StudioProfileWorkspaceProps) {
  const [extraSocials, setExtraSocials] = useState<SocialKey[]>([]);
  const socials = useMemo(() => {
    const base = visibleSocials(values);
    return [...new Set([...base, ...extraSocials])];
  }, [values, extraSocials]);
  const nextSocial = nextSocialToAdd(socials);
  const years = useMemo(() => foundedYearOptions(), []);
  const additionalDetails = useMemo(() => {
    const items = completion.items.filter(
      (item) =>
        item.id === "gallery" ||
        item.id === "faqs" ||
        item.id === "testimonials",
    );
    const done = items.filter((item) => item.done).length;
    return {
      items,
      status:
        items.length > 0 && done === items.length
          ? "Complete"
          : done > 0
            ? `${done} of ${items.length}`
            : "Optional",
      complete: items.length > 0 && done === items.length,
    };
  }, [completion.items]);
  const coverUrls = [
    studio.heroDesktopUrl,
    studio.heroMobileUrl,
    branch ? coverUrl(branch) : null,
    ...(studio.photos ?? []),
  ].filter((url): url is string => Boolean(url));

  return (
    <div className={styles.workspace} data-dirty={isDirty ? "true" : undefined}>
      <div className={styles.editor}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Basic information</h2>
            <p className={styles.cardHint}>
              Tell students and parents about your studio.
            </p>
          </header>
          <div className={styles.fields}>
            <ProfileField label="Studio name" required>
              <Input
                aria-label="Studio name"
                value={values.name}
                onChange={(event) => setField("name", event.target.value)}
                autoComplete="organization"
                required
              />
            </ProfileField>
            <ProfileField
              label="Tagline"
              hint="A short statement shown beneath the studio name."
              counter={`${values.tagline.length}/${TAGLINE_MAX}`}
            >
              <Input
                aria-label="Tagline"
                value={values.tagline}
                onChange={(event) =>
                  setField("tagline", event.target.value.slice(0, TAGLINE_MAX))
                }
                maxLength={TAGLINE_MAX}
              />
            </ProfileField>
            <ProfileField
              label="Founded year"
              hint="Shown as Since 2018 on the public page."
            >
              <select
                className={styles.select}
                value={values.foundedYear}
                onChange={(event) =>
                  setField("foundedYear", event.target.value)
                }
                aria-label="Founded year"
              >
                <option value="">Not set</option>
                {years.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </ProfileField>
            <ProfileField
              label="About"
              hint="A short note about who you teach and what the floor feels like."
              counter={`${values.about.length}/${ABOUT_MAX}`}
            >
              <TextArea
                aria-label="About"
                value={values.about}
                onChange={(event) =>
                  setField("about", event.target.value.slice(0, ABOUT_MAX))
                }
                rows={5}
                maxLength={ABOUT_MAX}
              />
            </ProfileField>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Contact information</h2>
            <p className={styles.cardHint}>
              How visitors can reach your studio.
            </p>
          </header>
          <div className={styles.contactGrid}>
            <ProfileField label="Phone number" required>
              <PhoneField
                value={values.contact}
                onChange={(contact) => setField("contact", contact)}
              />
            </ProfileField>
            <ProfileField label="Email">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="mail" />
                </InputGroupAddon>
                <Input
                  type="email"
                  value={values.email}
                  onChange={(event) => setField("email", event.target.value)}
                  autoComplete="email"
                  aria-label="Email"
                />
              </InputGroup>
            </ProfileField>
            <ProfileField label="Website">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="globe" />
                </InputGroupAddon>
                <Input
                  value={values.websiteUrl}
                  onChange={(event) =>
                    setField("websiteUrl", event.target.value)
                  }
                  inputMode="url"
                  aria-label="Website"
                  placeholder="https://studio.com"
                />
              </InputGroup>
            </ProfileField>
            {socials.map((social) => (
              <SocialField
                key={social}
                social={social}
                value={
                  social === "instagram"
                    ? values.instagramUrl
                    : social === "youtube"
                      ? values.youtubeUrl
                      : values.whatsapp
                }
                onChange={(next) => {
                  if (social === "instagram") setField("instagramUrl", next);
                  else if (social === "youtube") setField("youtubeUrl", next);
                  else setField("whatsapp", next);
                }}
              />
            ))}
          </div>
          {nextSocial ? (
            <button
              type="button"
              className={styles.addLink}
              onClick={() =>
                setExtraSocials((current) => [...current, nextSocial])
              }
            >
              <Icon name="plus" />
              Add another social link
            </button>
          ) : null}
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>First class</h2>
            <p className={styles.cardHint}>
              Information for new students before they walk in.
            </p>
          </header>
          <div className={styles.fields}>
            <ProfileField
              label="Trial note"
              hint="First trial is free."
              counter={`${values.trialBlurb.length}/${TRIAL_MAX}`}
            >
              <Input
                aria-label="Trial note"
                value={values.trialBlurb}
                onChange={(event) =>
                  setField("trialBlurb", event.target.value.slice(0, TRIAL_MAX))
                }
                maxLength={TRIAL_MAX}
              />
            </ProfileField>
            <ProfileField
              label="What to bring"
              hint="Shoes, water, or anything students should know before class."
              counter={`${values.whatToBring.length}/${WHAT_TO_BRING_MAX}`}
            >
              <TextArea
                aria-label="What to bring"
                value={values.whatToBring}
                onChange={(event) =>
                  setField(
                    "whatToBring",
                    event.target.value.slice(0, WHAT_TO_BRING_MAX),
                  )
                }
                rows={3}
                maxLength={WHAT_TO_BRING_MAX}
              />
            </ProfileField>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Studio address</h2>
            <p className={styles.cardHint}>Your primary studio address.</p>
          </header>
          <div className={styles.fields}>
            <ProfileField label="Address">
              <InputGroup>
                <InputGroupAddon>
                  <Icon name="map-pin" />
                </InputGroupAddon>
                <Input
                  value={values.address}
                  onChange={(event) => setField("address", event.target.value)}
                  autoComplete="street-address"
                  aria-label="Studio address"
                />
              </InputGroup>
            </ProfileField>
            <div className={styles.map}>
              <BranchMap
                compact
                value={coordinates}
                onChange={onCoordinatesChange}
                resolveShortLink={resolveMapLink}
              />
            </div>
          </div>
        </section>

        <OptionalSection
          title="Additional details"
          description="Gallery, FAQs, and testimonials for visitors."
          status={additionalDetails.status}
          complete={additionalDetails.complete}
        >
          <ul className={styles.extraList}>
            {additionalDetails.items.map((item) => (
              <li key={item.id} data-done={item.done ? "true" : undefined}>
                <Icon name={item.done ? "check-circle" : "circle"} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className={styles.hint}>
            Edit gallery, FAQs, and testimonials on each{" "}
            <Link to="/app/locations" className={styles.inlineLink}>
              location
            </Link>
            .
          </p>
        </OptionalSection>

        {isOwner ? (
          <OptionalSection
            title="Branding"
            description="Logo, colors and visual identity"
            status={studio.logoUrl ? "Complete" : "Incomplete"}
            complete={Boolean(studio.logoUrl)}
          >
            <BrandingPanel
              studioName={values.name || studio.name}
              logoUrl={studio.logoUrl ?? null}
              heroMobileUrl={studio.heroMobileUrl ?? null}
              heroDesktopUrl={studio.heroDesktopUrl ?? null}
            />
          </OptionalSection>
        ) : null}

        {isOwner ? (
          <DanceStylesSection
            styleCount={studio.settings?.danceStyles?.length ?? 0}
          />
        ) : null}

        {saveError ? <p className={styles.error}>{saveError}</p> : null}

        <SettingsSaveBar
          isDirty={isDirty}
          isPending={isPending}
          onCancel={onDiscard}
          onSave={onSave}
          detail="Your profile hasn't been saved."
          dock
        />
      </div>

      <aside className={styles.rail}>
        <StudioProfilePreview
          studioId={studio.id}
          values={values}
          coverUrls={coverUrls}
          branch={branch}
        />
        <StudioProfileCompletion
          percent={completion.percent}
          items={completion.items}
        />
      </aside>
    </div>
  );
}

function DanceStylesSection({ styleCount }: { styleCount: number }) {
  const editor = useStudioDanceStyles();
  const count = editor.styles.length || styleCount;

  return (
    <OptionalSection
      title="Dance styles"
      description="Styles you offer at your studio"
      status={count > 0 ? `${count} selected` : "None selected"}
      complete={count > 0}
    >
      <DanceStylesEditor
        styles={editor.styles}
        busy={editor.busy}
        onAdd={editor.addStyle}
        onRemove={editor.removeStyle}
        onMove={editor.moveStyle}
        onUpdate={editor.updateStyle}
      />
      <SettingsSaveBar
        isDirty={editor.isDirty}
        isPending={editor.busy}
        onCancel={editor.reset}
        onSave={editor.save}
        saveLabel="Save dance styles"
        detail="Style catalog changes save separately."
      />
    </OptionalSection>
  );
}

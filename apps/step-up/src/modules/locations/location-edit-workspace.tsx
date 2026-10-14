import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon, type IconName } from "@dev-ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { FormInput } from "@/modules/ui/form-input";
import { FormTextArea } from "@/modules/ui/form-text-area";
import { Screen } from "@/modules/ui/screen";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";
import { BranchMap } from "./branch-map";
import {
  canSaveDraft,
  completeFaqs,
  completeTestimonials,
  DESCRIPTION_MAX,
  draftFromBranch,
  draftsEqual,
  emptyLocationDraft,
  formatSavedAt,
  type LocationEditDraft,
  locationEditCompletion,
} from "./location-edit-draft";
import {
  LocationEditCompletion,
  LocationEditPreview,
} from "./location-edit-preview";
import styles from "./location-edit-workspace.module.scss";
import { LocationHoursEditor } from "./location-hours-editor";
import { MediaManager } from "./media-manager";
import { AMENITY_OPTIONS, coverUrl, type StudioBranch } from "./types";

const AMENITY_ICONS: Record<string, IconName> = {
  parking: "map-pin",
  ac: "sun",
  lockers: "lock",
  showers: "sparkles",
  wifi: "wifi",
  water: "cloud",
  changing_rooms: "users",
  waiting_area: "home",
};

type LocationEditWorkspaceProps = {
  branch: StudioBranch;
};

export function LocationEditWorkspace({ branch }: LocationEditWorkspaceProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("LocationEditWorkspace");
  const [draft, setDraft] = useState<LocationEditDraft>(emptyLocationDraft);
  const baselineRef = useRef<LocationEditDraft | null>(null);
  const hydratedForId = useRef<string | null>(null);
  const [savedAt, setSavedAt] = useState(branch.updatedAt ?? null);

  useEffect(() => {
    if (hydratedForId.current === branch.id) return;
    const next = draftFromBranch(branch);
    setDraft(next);
    baselineRef.current = next;
    hydratedForId.current = branch.id;
    setSavedAt(branch.updatedAt ?? null);
  }, [branch]);

  const isDirty = Boolean(
    baselineRef.current && !draftsEqual(draft, baselineRef.current),
  );
  const canSave = canSaveDraft(draft);
  const mediaCount = (branch.media ?? []).filter(
    (item) => !item.archivedAt,
  ).length;
  const completion = useMemo(
    () => locationEditCompletion({ draft, mediaCount }),
    [draft, mediaCount],
  );

  function patch<K extends keyof LocationEditDraft>(
    key: K,
    value: LocationEditDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      await api.patch<StudioBranch>(`/branches/${branch.id}`, {
        name: draft.name.trim(),
        address: draft.address.trim(),
        description: draft.description.trim() || null,
        pricingBlurb: draft.pricingBlurb.trim() || null,
        amenities: draft.amenities,
        openingHours: draft.hours,
        latitude: draft.coordinates?.latitude ?? null,
        longitude: draft.coordinates?.longitude ?? null,
      });
      await api.patch(`/branches/${branch.id}/faqs`, {
        faqs: completeFaqs(draft.faqs),
      });
      await api.patch(`/branches/${branch.id}/testimonials`, {
        testimonials: completeTestimonials(draft.testimonials),
      });
    },
    onSuccess: async () => {
      baselineRef.current = draft;
      setSavedAt(new Date().toISOString());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["branch", branch.id] }),
        queryClient.invalidateQueries({
          queryKey: ["branch-landing", branch.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["branches"] }),
      ]);
      toast({
        title: "Location saved",
        description: "Students will see these details on the public page.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save location",
        description:
          error instanceof Error ? error.message : "Could not save location.",
        variant: "error",
      });
    },
  });

  function renderSave(testId?: string) {
    return (
      <TouchButton
        variant="primary"
        size="sm"
        {...(testId ? { "data-testid": testId } : {})}
        onClick={() => save.mutate()}
        isPending={save.isPending}
        isDisabled={!isDirty || !canSave || save.isPending}
      >
        Save changes
      </TouchButton>
    );
  }

  return (
    <Screen
      title="Edit location"
      subtitle={branch.name}
      showBack
      backTo={`/app/locations/${branch.id}`}
      wide
      paddedCta={isDirty}
      actions={
        <>
          {isDirty ? (
            <span className={styles.unsaved}>Unsaved changes</span>
          ) : null}
          {renderSave("location-edit-save")}
        </>
      }
    >
      <div className={styles.workspace}>
        <div className={styles.editor}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <Icon name="map-pin" />
              <div>
                <h2 className={styles.cardTitle}>Location details</h2>
                <p className={styles.cardHint}>
                  Name, address, and the map pin students use for directions.
                </p>
              </div>
            </header>
            <div className={styles.fields}>
              <FormInput
                label="Name"
                value={draft.name}
                onChange={(name) => patch("name", name)}
                required
              />
              <FormTextArea
                label="Address"
                value={draft.address}
                onChange={(address) => patch("address", address)}
                autoComplete="street-address"
                required
                rows={3}
              />
              <div className={styles.fieldBlock}>
                <FormTextArea
                  label="Description"
                  value={draft.description}
                  onChange={(description) =>
                    patch("description", description.slice(0, DESCRIPTION_MAX))
                  }
                  maxLength={DESCRIPTION_MAX}
                  rows={4}
                />
                <p className={styles.charCount}>
                  {draft.description.length}/{DESCRIPTION_MAX}
                </p>
              </div>
              <div className={styles.map}>
                <BranchMap
                  value={draft.coordinates}
                  onChange={(coordinates) => patch("coordinates", coordinates)}
                  resolveShortLink={async (url) => {
                    const result = await api.post<{ url: string }>(
                      "/branches/resolve-map-url",
                      { url },
                    );
                    return result.url;
                  }}
                />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <Icon name="layout-grid" />
              <div>
                <h2 className={styles.cardTitle}>Amenities</h2>
                <p className={styles.cardHint}>
                  Select the facilities available at this location.
                </p>
              </div>
            </header>
            <div className={styles.amenityGrid}>
              {AMENITY_OPTIONS.map((option) => {
                const selected = draft.amenities.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={styles.amenity}
                    aria-pressed={selected}
                    data-selected={selected ? "true" : undefined}
                    onClick={() =>
                      patch(
                        "amenities",
                        selected
                          ? draft.amenities.filter((id) => id !== option.id)
                          : [...draft.amenities, option.id],
                      )
                    }
                  >
                    <Icon name={AMENITY_ICONS[option.id] ?? "check"} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <Icon name="clock" />
              <div>
                <h2 className={styles.cardTitle}>Opening hours</h2>
                <p className={styles.cardHint}>
                  Set the operating hours for this location.
                </p>
              </div>
            </header>
            <LocationHoursEditor
              hours={draft.hours}
              onChange={(hours) => patch("hours", hours)}
            />
            <FormInput
              label="Hours notes"
              value={draft.hours.notes ?? ""}
              onChange={(notes) => {
                const next = { ...draft.hours };
                if (notes) next.notes = notes;
                else delete next.notes;
                patch("hours", next);
              }}
            />
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <Icon name="eye" />
              <div>
                <h2 className={styles.cardTitle}>Public profile</h2>
                <p className={styles.cardHint}>
                  Student facing marketing content, kept separate from
                  operations.
                </p>
              </div>
            </header>
            <PublicProfileEditor
              branch={branch}
              draft={draft}
              onChange={setDraft}
            />
          </section>

          <footer className={styles.footer}>
            <p className={styles.saved}>
              {isDirty
                ? "Unsaved changes"
                : savedAt
                  ? formatSavedAt(savedAt)
                  : "No changes yet"}
            </p>
            {renderSave()}
          </footer>
        </div>

        <aside className={styles.rail}>
          <LocationEditPreview
            branchId={branch.id}
            coverUrl={coverUrl(branch)}
            draft={draft}
          />
          <LocationEditCompletion
            percent={completion.percent}
            items={completion.items}
          />
        </aside>
      </div>

      {isDirty ? (
        <div className={styles.mobileSave}>
          <StickyCtaBar>{renderSave()}</StickyCtaBar>
        </div>
      ) : null}
    </Screen>
  );
}

function PublicProfileEditor({
  branch,
  draft,
  onChange,
}: {
  branch: StudioBranch;
  draft: LocationEditDraft;
  onChange: (draft: LocationEditDraft) => void;
}) {
  return (
    <Tabs defaultSelectedKey="membership" aria-label="Public profile">
      <TabList className={styles.tabList}>
        <Tab id="membership" className={styles.tab}>
          Membership
        </Tab>
        <Tab id="photos" className={styles.tab}>
          Photos
        </Tab>
        <Tab id="faqs" className={styles.tab}>
          FAQs
        </Tab>
        <Tab id="testimonials" className={styles.tab}>
          Testimonials
        </Tab>
      </TabList>

      <TabPanel id="membership" className={styles.tabPanel}>
        <FormTextArea
          label="Membership blurb"
          value={draft.pricingBlurb}
          onChange={(pricingBlurb) => onChange({ ...draft, pricingBlurb })}
          rows={4}
        />
        <p className={styles.cardHint}>
          A short note about plans, trials, or what to ask at the front desk.
        </p>
      </TabPanel>

      <TabPanel id="photos" className={styles.tabPanel}>
        <MediaManager
          branchId={branch.id}
          media={branch.media ?? []}
          coverMediaId={branch.coverMediaId}
          heading={null}
        />
      </TabPanel>

      <TabPanel id="faqs" className={styles.tabPanel}>
        <div className={styles.listHeader}>
          <p className={styles.cardHint}>
            Answer questions students ask before they visit.
          </p>
          <TouchButton
            size="sm"
            variant="default"
            onClick={() =>
              onChange({
                ...draft,
                faqs: [
                  ...draft.faqs,
                  { id: crypto.randomUUID(), question: "", answer: "" },
                ],
              })
            }
          >
            Add FAQ
          </TouchButton>
        </div>
        {draft.faqs.length === 0 ? (
          <p className={styles.empty}>No FAQs yet.</p>
        ) : null}
        {draft.faqs.map((faq, index) => (
          <div key={faq.id} className={styles.stack}>
            <FormInput
              label="Question"
              value={faq.question}
              onChange={(question) =>
                onChange({
                  ...draft,
                  faqs: draft.faqs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, question } : item,
                  ),
                })
              }
            />
            <FormTextArea
              label="Answer"
              value={faq.answer}
              onChange={(answer) =>
                onChange({
                  ...draft,
                  faqs: draft.faqs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, answer } : item,
                  ),
                })
              }
            />
            <TouchButton
              size="sm"
              variant="quiet"
              onClick={() =>
                onChange({
                  ...draft,
                  faqs: draft.faqs.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
            >
              Remove
            </TouchButton>
          </div>
        ))}
      </TabPanel>

      <TabPanel id="testimonials" className={styles.tabPanel}>
        <div className={styles.listHeader}>
          <p className={styles.cardHint}>
            Short quotes from students or parents.
          </p>
          <TouchButton
            size="sm"
            variant="default"
            onClick={() =>
              onChange({
                ...draft,
                testimonials: [
                  ...draft.testimonials,
                  {
                    id: crypto.randomUUID(),
                    quote: "",
                    authorName: "",
                    rating: "5",
                  },
                ],
              })
            }
          >
            Add quote
          </TouchButton>
        </div>
        {draft.testimonials.length === 0 ? (
          <p className={styles.empty}>No testimonials yet.</p>
        ) : null}
        {draft.testimonials.map((item, index) => (
          <div key={item.id} className={styles.stack}>
            <FormTextArea
              label="Quote"
              value={item.quote}
              onChange={(quote) =>
                onChange({
                  ...draft,
                  testimonials: draft.testimonials.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, quote } : row,
                  ),
                })
              }
            />
            <div className={styles.fields}>
              <FormInput
                label="Author"
                value={item.authorName}
                onChange={(authorName) =>
                  onChange({
                    ...draft,
                    testimonials: draft.testimonials.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, authorName } : row,
                    ),
                  })
                }
              />
              <FormInput
                label="Rating (1 to 5)"
                value={item.rating}
                onChange={(rating) =>
                  onChange({
                    ...draft,
                    testimonials: draft.testimonials.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, rating } : row,
                    ),
                  })
                }
              />
            </div>
            <TouchButton
              size="sm"
              variant="quiet"
              onClick={() =>
                onChange({
                  ...draft,
                  testimonials: draft.testimonials.filter(
                    (_, rowIndex) => rowIndex !== index,
                  ),
                })
              }
            >
              Remove
            </TouchButton>
          </div>
        ))}
      </TabPanel>
    </Tabs>
  );
}

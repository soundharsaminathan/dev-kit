import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { BranchMap } from "@/modules/locations/branch-map";
import { MediaManager } from "@/modules/locations/media-manager";
import {
  AMENITY_OPTIONS,
  type MapCoordinates,
  type OpeningHours,
  type StudioBranch,
  WEEKDAY_LABELS,
} from "@/modules/locations/types";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./edit.module.scss";

export const Route = createFileRoute("/app/locations/$id/edit")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: LocationEditPage,
});

type FaqDraft = { id: string; question: string; answer: string };
type TestimonialDraft = {
  id: string;
  quote: string;
  authorName: string;
  rating: string;
};

function defaultHours(): OpeningHours {
  return {
    days: WEEKDAY_LABELS.map((_, day) => ({
      day,
      closed: day === 0,
      open: "09:00",
      close: "21:00",
    })),
  };
}

function LocationEditPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["branch", id, "edit"],
    queryFn: () =>
      api.get<StudioBranch>(`/branches/${id}?includeArchived=false`),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [pricingBlurb, setPricingBlurb] = useState("");
  const [coordinates, setCoordinates] = useState<MapCoordinates | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [hours, setHours] = useState<OpeningHours>(defaultHours());
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialDraft[]>([]);

  useEffect(() => {
    if (!query.data) return;
    setName(query.data.name);
    setAddress(query.data.address);
    setDescription(query.data.description ?? "");
    setPricingBlurb(query.data.pricingBlurb ?? "");
    setAmenities(query.data.amenities ?? []);
    setHours(query.data.openingHours ?? defaultHours());
    setFaqs(
      (query.data.faqs ?? []).map((faq) => ({
        id: crypto.randomUUID(),
        question: faq.question,
        answer: faq.answer,
      })),
    );
    setTestimonials(
      (query.data.testimonials ?? []).map((item) => ({
        id: crypto.randomUUID(),
        quote: item.quote,
        authorName: item.authorName,
        rating: item.rating != null ? String(item.rating) : "",
      })),
    );
    if (query.data.latitude != null && query.data.longitude != null) {
      setCoordinates({
        latitude: query.data.latitude,
        longitude: query.data.longitude,
      });
    }
  }, [query.data]);

  const saveBasics = useMutation({
    mutationFn: () =>
      api.patch<StudioBranch>(`/branches/${id}`, {
        name: name.trim(),
        address: address.trim(),
        description: description.trim() || null,
        pricingBlurb: pricingBlurb.trim() || null,
        amenities,
        openingHours: hours,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["branch", id] }),
        queryClient.invalidateQueries({ queryKey: ["branch-landing", id] }),
        queryClient.invalidateQueries({ queryKey: ["branches"] }),
      ]);
    },
  });

  const saveFaqs = useMutation({
    mutationFn: () =>
      api.patch(`/branches/${id}/faqs`, {
        faqs: faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch", id] });
      await queryClient.invalidateQueries({
        queryKey: ["branch-landing", id],
      });
    },
  });

  const saveTestimonials = useMutation({
    mutationFn: () =>
      api.patch(`/branches/${id}/testimonials`, {
        testimonials: testimonials
          .filter((item) => item.quote.trim() && item.authorName.trim())
          .map((item) => ({
            quote: item.quote.trim(),
            authorName: item.authorName.trim(),
            rating: item.rating ? Number(item.rating) : null,
          })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch", id] });
      await queryClient.invalidateQueries({
        queryKey: ["branch-landing", id],
      });
    },
  });

  if (query.isLoading) {
    return (
      <Screen title="Edit location" showBack backTo={`/app/locations/${id}`}>
        <SkeletonBlock height="12rem" />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen title="Edit location" showBack backTo="/app/locations">
        <ErrorState
          description={
            query.error instanceof Error
              ? query.error.message
              : "Could not load location."
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Edit location"
      subtitle={query.data.name}
      showBack
      backTo={`/app/locations/${id}`}
      wide
    >
      <div className={styles.root}>
        <section className={styles.section}>
          <h2 className={styles.heading}>Basics</h2>
          <FormInput label="Name" value={name} onChange={setName} />
          <FormInput label="Address" value={address} onChange={setAddress} />
          <FormInput
            label="Description"
            value={description}
            onChange={setDescription}
          />
          <FormInput
            label="Membership blurb"
            value={pricingBlurb}
            onChange={setPricingBlurb}
          />
          <div className={styles.mapWrap}>
            <BranchMap value={coordinates} onChange={setCoordinates} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Amenities</h2>
          <div className={styles.amenityGrid}>
            {AMENITY_OPTIONS.map((option) => {
              const checked = amenities.includes(option.id);
              return (
                <label key={option.id} className={styles.amenity}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setAmenities((current) =>
                        checked
                          ? current.filter((id) => id !== option.id)
                          : [...current, option.id],
                      );
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Opening hours</h2>
          <div className={styles.hours}>
            {(hours.days ?? []).map((day, index) => (
              <div key={day.day} className={styles.hoursRow}>
                <span className={styles.dayLabel}>
                  {WEEKDAY_LABELS[day.day]}
                </span>
                <label className={styles.closed}>
                  <input
                    type="checkbox"
                    checked={Boolean(day.closed)}
                    onChange={(event) => {
                      const closed = event.target.checked;
                      setHours((current) => ({
                        ...current,
                        days: (current.days ?? []).map((item, i) =>
                          i === index ? { ...item, closed } : item,
                        ),
                      }));
                    }}
                  />
                  Closed
                </label>
                {!day.closed ? (
                  <>
                    <input
                      className={styles.time}
                      type="time"
                      value={day.open ?? "09:00"}
                      onChange={(event) => {
                        const open = event.target.value;
                        setHours((current) => ({
                          ...current,
                          days: (current.days ?? []).map((item, i) =>
                            i === index ? { ...item, open } : item,
                          ),
                        }));
                      }}
                    />
                    <input
                      className={styles.time}
                      type="time"
                      value={day.close ?? "21:00"}
                      onChange={(event) => {
                        const close = event.target.value;
                        setHours((current) => ({
                          ...current,
                          days: (current.days ?? []).map((item, i) =>
                            i === index ? { ...item, close } : item,
                          ),
                        }));
                      }}
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <FormInput
            label="Hours notes"
            value={hours.notes ?? ""}
            onChange={(notes) =>
              setHours((current) => {
                const next: OpeningHours = { ...current };
                if (notes) {
                  next.notes = notes;
                } else {
                  delete next.notes;
                }
                return next;
              })
            }
          />
        </section>

        <TouchButton
          variant="primary"
          onClick={() => saveBasics.mutate()}
          isPending={saveBasics.isPending}
          isDisabled={!name.trim() || !address.trim() || !coordinates}
        >
          Save details
        </TouchButton>
        {saveBasics.isError ? (
          <p className={styles.error}>
            {saveBasics.error instanceof Error
              ? saveBasics.error.message
              : "Could not save."}
          </p>
        ) : null}
        {saveBasics.isSuccess ? (
          <p className={styles.success}>Details saved.</p>
        ) : null}

        <MediaManager
          branchId={id}
          media={query.data.media ?? []}
          coverMediaId={query.data.coverMediaId}
        />

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.heading}>FAQs</h2>
            <TouchButton
              size="sm"
              variant="default"
              onClick={() =>
                setFaqs((current) => [
                  ...current,
                  { id: crypto.randomUUID(), question: "", answer: "" },
                ])
              }
            >
              Add FAQ
            </TouchButton>
          </div>
          {faqs.map((faq, index) => (
            <div key={faq.id} className={styles.stack}>
              <FormInput
                label="Question"
                value={faq.question}
                onChange={(question) =>
                  setFaqs((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, question } : item,
                    ),
                  )
                }
              />
              <FormInput
                label="Answer"
                value={faq.answer}
                onChange={(answer) =>
                  setFaqs((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, answer } : item,
                    ),
                  )
                }
              />
              <TouchButton
                size="sm"
                variant="quiet"
                onClick={() =>
                  setFaqs((current) => current.filter((_, i) => i !== index))
                }
              >
                Remove
              </TouchButton>
            </div>
          ))}
          <TouchButton
            variant="default"
            onClick={() => saveFaqs.mutate()}
            isPending={saveFaqs.isPending}
          >
            Save FAQs
          </TouchButton>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.heading}>Testimonials</h2>
            <TouchButton
              size="sm"
              variant="default"
              onClick={() =>
                setTestimonials((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    quote: "",
                    authorName: "",
                    rating: "5",
                  },
                ])
              }
            >
              Add quote
            </TouchButton>
          </div>
          {testimonials.map((item, index) => (
            <div key={item.id} className={styles.stack}>
              <FormInput
                label="Quote"
                value={item.quote}
                onChange={(quote) =>
                  setTestimonials((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, quote } : row,
                    ),
                  )
                }
              />
              <FormInput
                label="Author"
                value={item.authorName}
                onChange={(authorName) =>
                  setTestimonials((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, authorName } : row,
                    ),
                  )
                }
              />
              <FormInput
                label="Rating (1-5)"
                value={item.rating}
                onChange={(rating) =>
                  setTestimonials((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, rating } : row,
                    ),
                  )
                }
              />
              <TouchButton
                size="sm"
                variant="quiet"
                onClick={() =>
                  setTestimonials((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </TouchButton>
            </div>
          ))}
          <TouchButton
            variant="default"
            onClick={() => saveTestimonials.mutate()}
            isPending={saveTestimonials.isPending}
          >
            Save testimonials
          </TouchButton>
        </section>

        <TouchButton
          variant="quiet"
          onClick={() =>
            void navigate({ to: "/app/locations/$id", params: { id } })
          }
        >
          Back to location page
        </TouchButton>
      </div>
    </Screen>
  );
}

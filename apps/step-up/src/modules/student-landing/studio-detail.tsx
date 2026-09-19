import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import {
  LocationAmenities,
  LocationFaqs,
  LocationHours,
  LocationPricing,
  LocationTestimonials,
} from "@/modules/locations/location-content";
import { mapsUrl, type OpeningHours } from "@/modules/locations/types";
import styles from "./studio-detail.module.scss";
import type {
  DiscoverBranchVisit,
  DiscoverFaq,
  DiscoverGalleryItem,
  DiscoverTestimonial,
  DiscoverTrainer,
  DiscoverTrialSlot,
} from "./types";

export function whatsappHref(value: string) {
  return `https://wa.me/${value.replace(/\D/g, "")}`;
}

export function externalHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function instagramLabel(value: string) {
  try {
    const parsed = new URL(externalHref(value));
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") return path.replace(/^\//, "");
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^@/, "");
  }
}

export function formatTrialSlot(slot: DiscoverTrialSlot) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot.startsAt));
}

export function StudioAbout({
  about,
  foundedYear,
}: {
  about: string | null | undefined;
  foundedYear: number | null | undefined;
}) {
  if (!about && foundedYear == null) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>About</h2>
      {foundedYear != null ? (
        <p className={styles.meta}>Since {foundedYear}</p>
      ) : null}
      {about ? <p className={styles.body}>{about}</p> : null}
    </section>
  );
}

export function StudioLinks({
  contact,
  email,
  whatsapp,
  instagramUrl,
  youtubeUrl,
  websiteUrl,
}: {
  contact: string | null;
  email: string | null | undefined;
  whatsapp: string | null | undefined;
  instagramUrl: string | null | undefined;
  youtubeUrl: string | null | undefined;
  websiteUrl: string | null | undefined;
}) {
  const links = [
    whatsapp ? { href: whatsappHref(whatsapp), label: "WhatsApp" } : null,
    contact ? { href: `tel:${contact}`, label: "Call" } : null,
    email ? { href: `mailto:${email}`, label: email } : null,
    instagramUrl
      ? {
          href: externalHref(instagramUrl),
          label: `@${instagramLabel(instagramUrl)}`,
        }
      : null,
    youtubeUrl ? { href: externalHref(youtubeUrl), label: "YouTube" } : null,
    websiteUrl ? { href: externalHref(websiteUrl), label: "Website" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (links.length === 0) return null;

  return (
    <div className={styles.links}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noreferrer" : undefined}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function StudioTrainers({ trainers }: { trainers: DiscoverTrainer[] }) {
  if (trainers.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Trainers</h2>
      <ul className={styles.trainerList}>
        {trainers.map((trainer) => (
          <li key={trainer.id} className={styles.trainer}>
            <Avatar size="md">
              {trainer.photoUrl ? (
                <AvatarImage src={trainer.photoUrl} alt="" />
              ) : null}
              <AvatarFallback>{trainer.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className={styles.trainerName}>{trainer.name}</p>
              {trainer.styles.length > 0 ? (
                <p className={styles.meta}>{trainer.styles.join(" · ")}</p>
              ) : null}
              {trainer.bio ? (
                <p className={styles.body}>{trainer.bio}</p>
              ) : null}
              {trainer.instagramUrl ? (
                <a
                  href={externalHref(trainer.instagramUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{instagramLabel(trainer.instagramUrl)}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StudioGallery({ items }: { items: DiscoverGalleryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Photos</h2>
      <div className={styles.gallery}>
        {items.map((item) => (
          <img
            key={item.url}
            src={item.url}
            alt={item.caption ?? ""}
            className={styles.galleryImage}
          />
        ))}
      </div>
    </section>
  );
}

export function StudioVisit({
  address,
  branches,
}: {
  address: string | null;
  branches: DiscoverBranchVisit[];
}) {
  const branch = branches[0] ?? null;
  const lat = branch?.latitude ?? null;
  const lng = branch?.longitude ?? null;
  const amenities = branch?.amenities ?? [];
  const hours = (branch?.openingHours ?? null) as OpeningHours | null;
  const pricing = branch?.pricingBlurb ?? null;
  const description = branch?.description ?? null;

  if (
    !address &&
    !branch &&
    amenities.length === 0 &&
    !hours &&
    !pricing &&
    !description
  ) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Visit</h2>
      {branch?.name && branches.length > 1 ? (
        <p className={styles.meta}>{branch.name}</p>
      ) : null}
      {description ? <p className={styles.body}>{description}</p> : null}
      {address || branch?.address ? (
        <p className={styles.body}>{branch?.address || address}</p>
      ) : null}
      {lat != null && lng != null ? (
        <a href={mapsUrl(lat, lng)} target="_blank" rel="noreferrer">
          Open in Maps
        </a>
      ) : null}
      <LocationAmenities amenities={amenities} />
      <LocationHours hours={hours} />
      <LocationPricing blurb={pricing} />
    </section>
  );
}

export function StudioReviews({
  testimonials,
}: {
  testimonials: DiscoverTestimonial[];
}) {
  return <LocationTestimonials testimonials={testimonials} />;
}

export function StudioFaqs({ faqs }: { faqs: DiscoverFaq[] }) {
  return <LocationFaqs faqs={faqs} />;
}

export function StudioPrep({
  whatToBring,
}: {
  whatToBring: string | null | undefined;
}) {
  if (!whatToBring) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>First class</h2>
      <p className={styles.body}>{whatToBring}</p>
    </section>
  );
}

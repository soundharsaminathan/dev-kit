import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { useEffect, useState } from "react";
import {
  AMENITY_OPTIONS,
  mapsUrl,
  type OpeningHours,
  WEEKDAY_LABELS,
} from "@/modules/locations/types";
import shared from "@/modules/marketing/marketing.module.scss";
import { Reveal } from "@/modules/marketing/reveal";
import { TouchButton } from "@/modules/ui/touch-button";
import { STUDENT_STUDIO, STUDENT_TRIAL } from "./content";
import { FaqItem } from "./faq";
import faqStyles from "./faq.module.scss";
import { formatPriceFrom, formatRating } from "./format";
import howStyles from "./how-it-works.module.scss";
import {
  externalHref,
  formatTrialSlot,
  instagramLabel,
  whatsappHref,
} from "./studio-detail";
import styles from "./studio-landing.module.scss";
import { WordReveal } from "./tagline";
import type {
  DiscoverBatchSummary,
  DiscoverStudioDetail,
  DiscoverTrainer,
} from "./types";

function studioSupport(studio: DiscoverStudioDetail) {
  if (studio.tagline) return studio.tagline;
  const kids = studio.batches.some((batch) => batch.category === "KIDS");
  const adults = studio.batches.some((batch) => batch.category === "ADULTS");
  if (kids && adults) return STUDENT_STUDIO.supportBoth(studio.name);
  if (kids) return STUDENT_STUDIO.supportKids(studio.name);
  if (adults) return STUDENT_STUDIO.supportAdults(studio.name);
  return STUDENT_STUDIO.supportGeneric(studio.name);
}

function amenityLabel(id: string) {
  return AMENITY_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

function visitAddress(studio: DiscoverStudioDetail) {
  const branch = studio.branches?.[0];
  const studioAddress = studio.address?.trim() || "";
  const branchAddress = branch?.address?.trim() || "";
  if (studioAddress.length >= branchAddress.length) {
    return studioAddress || branchAddress || null;
  }
  return branchAddress || studioAddress || null;
}

function studioLinks(studio: DiscoverStudioDetail) {
  return [
    studio.whatsapp
      ? { href: whatsappHref(studio.whatsapp), label: "WhatsApp" }
      : null,
    studio.contact ? { href: `tel:${studio.contact}`, label: "Call" } : null,
    studio.email ? { href: `mailto:${studio.email}`, label: "Email" } : null,
    studio.instagramUrl
      ? {
          href: externalHref(studio.instagramUrl),
          label: `@${instagramLabel(studio.instagramUrl)}`,
        }
      : null,
    studio.youtubeUrl
      ? { href: externalHref(studio.youtubeUrl), label: "YouTube" }
      : null,
    studio.websiteUrl
      ? { href: externalHref(studio.websiteUrl), label: "Website" }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;
}

function heroProof(
  studio: DiscoverStudioDetail,
  nextTrial: DiscoverStudioDetail["nextTrialSlot"],
  rating: string | null,
  price: string | null,
) {
  if (nextTrial) {
    return STUDENT_STUDIO.proofTrial(formatTrialSlot(nextTrial));
  }
  if (rating) return STUDENT_STUDIO.proofRating(rating, studio.ratingCount);
  if (price) return STUDENT_STUDIO.proofFrom(price);
  return STUDENT_STUDIO.proofBrowse;
}

function studioBenefits(
  studio: DiscoverStudioDetail,
  nextTrial: DiscoverStudioDetail["nextTrialSlot"],
  price: string | null,
) {
  const kids = studio.batches.some((batch) => batch.category === "KIDS");
  const adults = studio.batches.some((batch) => batch.category === "ADULTS");
  const trainers = studio.trainers ?? [];
  const items: Array<{ id: string; title: string; body: string }> = [];

  if (kids && adults) {
    items.push({
      id: "audience",
      title: STUDENT_STUDIO.benefitKidsAdultsTitle,
      body: STUDENT_STUDIO.benefitKidsAdultsBody,
    });
  } else if (kids) {
    items.push({
      id: "audience",
      title: STUDENT_STUDIO.benefitKidsTitle,
      body: STUDENT_STUDIO.benefitKidsBody,
    });
  } else if (adults) {
    items.push({
      id: "audience",
      title: STUDENT_STUDIO.benefitAdultsTitle,
      body: STUDENT_STUDIO.benefitAdultsBody,
    });
  }

  if (price) {
    items.push({
      id: "price",
      title: STUDENT_STUDIO.benefitPriceTitle,
      body: STUDENT_STUDIO.benefitPriceBody(price),
    });
  }

  if (nextTrial) {
    items.push({
      id: "trial",
      title: STUDENT_STUDIO.benefitTrialTitle,
      body: STUDENT_STUDIO.benefitTrialBody(formatTrialSlot(nextTrial)),
    });
  }

  if (trainers.length > 0) {
    items.push({
      id: "trainers",
      title: STUDENT_STUDIO.benefitTrainersTitle,
      body: STUDENT_STUDIO.benefitTrainersBody(trainers.length),
    });
  }

  if (studio.foundedYear != null) {
    items.push({
      id: "since",
      title: STUDENT_STUDIO.benefitSinceTitle(studio.foundedYear),
      body: STUDENT_STUDIO.benefitSinceBody,
    });
  }

  return items.slice(0, 4);
}

export function StudioLanding({
  studio,
  onBookTrial,
  dockHidden = false,
}: {
  studio: DiscoverStudioDetail;
  onBookTrial: (batchId?: string) => void;
  dockHidden?: boolean;
}) {
  const rating = formatRating(studio.ratingAvg, studio.ratingCount);
  const price = formatPriceFrom(studio.priceFrom, studio.priceCadence);
  const nextTrial = studio.nextTrialSlot ?? null;
  const dockMeta = nextTrial
    ? formatTrialSlot(nextTrial)
    : price
      ? STUDENT_STUDIO.proofFrom(price)
      : null;
  const trainers = studio.trainers ?? [];
  const gallery = studio.gallery ?? [];
  const faqs = studio.faqs ?? [];
  const testimonials = studio.testimonials ?? [];
  const kids = studio.batches.filter((batch) => batch.category === "KIDS");
  const adults = studio.batches.filter((batch) => batch.category === "ADULTS");
  const heroSrc =
    studio.heroDesktopUrl || studio.heroMobileUrl || studio.imageUrl;
  const place = [studio.locality, studio.city].filter(Boolean).join(" · ");
  const extraStyles = studio.styles.slice(1);
  const links = studioLinks(studio);
  const address = visitAddress(studio);
  const branch = studio.branches?.[0] ?? null;
  const hours = (branch?.openingHours ?? null) as OpeningHours | null;
  const amenities = branch?.amenities ?? [];
  const benefits = studioBenefits(studio, nextTrial, price);
  const faqItems =
    faqs.length > 0
      ? faqs.map((item) => ({ id: item.id, q: item.question, a: item.answer }))
      : STUDENT_STUDIO.defaultFaqs.map((item) => ({
          id: item.q,
          q: item.q,
          a: item.a,
        }));
  const showVisit =
    Boolean(address) ||
    amenities.length > 0 ||
    Boolean(hours?.days?.length || hours?.notes) ||
    links.length > 0 ||
    Boolean(branch?.description || branch?.pricingBlurb || branch?.coverUrl);

  useEffect(() => {
    const previous = document.title;
    const city = studio.city || "Chennai";
    document.title = `${studio.name} dance classes in ${city} | classa`;
    return () => {
      document.title = previous;
    };
  }, [studio.city, studio.name]);

  return (
    <article className={styles.page}>
      <section className={styles.hero} aria-labelledby="studio-headline">
        <div
          className={
            heroSrc
              ? `${styles.heroInner} ${styles.heroInnerSplit}`
              : `${styles.heroInner} ${styles.heroInnerCopy}`
          }
        >
          <div className={styles.heroCopy}>
            {studio.logoUrl ? (
              <img className={styles.logo} src={studio.logoUrl} alt="" />
            ) : null}
            {place ? <p className={styles.eyebrow}>{place}</p> : null}
            <p className={styles.kicker}>{studio.name}</p>
            <h1 id="studio-headline" className={styles.headline}>
              <HeroHeadline studio={studio} />
            </h1>
            <p className={styles.support}>{studioSupport(studio)}</p>
            {extraStyles.length > 0 ? (
              <p className={styles.moreStyles}>{extraStyles.join(" · ")}</p>
            ) : null}
            <p className={styles.proof}>
              {heroProof(studio, nextTrial, rating, price)}
              {nextTrial?.styleBadge ? ` · ${nextTrial.styleBadge}` : ""}
            </p>
            <div className={styles.heroCta}>
              <TouchButton variant="primary" onClick={() => onBookTrial()}>
                {STUDENT_TRIAL.cta}
              </TouchButton>
            </div>
            {studio.trialBlurb ? (
              <p className={styles.trialNote}>{studio.trialBlurb}</p>
            ) : null}
          </div>
          {heroSrc ? (
            <div className={styles.heroStage}>
              <img
                className={styles.heroMedia}
                src={heroSrc}
                alt={`${studio.name} studio`}
              />
            </div>
          ) : null}
        </div>
      </section>

      {benefits.length >= 3 ? (
        <section
          className={`${shared.section} ${styles.band}`}
          aria-labelledby="studio-why"
        >
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-why" className={shared.title}>
                {STUDENT_STUDIO.why}
              </h2>
            </Reveal>
            <ol
              className={
                benefits.length === 3
                  ? `${styles.benefits} ${styles.benefitsThree}`
                  : styles.benefits
              }
            >
              {benefits.map((item, index) => (
                <Reveal key={item.id} as="li" delay={index * 60}>
                  <article className={styles.benefit}>
                    <h3 className={styles.benefitTitle}>{item.title}</h3>
                    <p className={styles.benefitBody}>{item.body}</p>
                  </article>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {studio.about || studio.foundedYear != null || studio.whatToBring ? (
        <section className={shared.section} aria-labelledby="studio-about">
          <div className={`${shared.sectionInner} ${styles.copyBlock}`}>
            <Reveal>
              <h2 id="studio-about" className={shared.title}>
                {STUDENT_STUDIO.about}
              </h2>
              {studio.foundedYear != null ? (
                <p className={styles.meta}>
                  {STUDENT_STUDIO.since(studio.foundedYear)}
                </p>
              ) : null}
              {studio.about ? (
                <p className={shared.lede}>{studio.about}</p>
              ) : null}
              {studio.whatToBring ? (
                <div className={styles.note}>
                  <p className={styles.noteLabel}>
                    {STUDENT_STUDIO.firstClass}
                  </p>
                  <p className={styles.body}>{studio.whatToBring}</p>
                </div>
              ) : null}
            </Reveal>
          </div>
        </section>
      ) : null}

      {studio.batches.length > 0 ? (
        <section
          className={`${shared.section} ${styles.band}`}
          aria-labelledby="studio-classes"
        >
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-classes" className={shared.title}>
                {STUDENT_STUDIO.classes}
              </h2>
            </Reveal>
            <ClassGroup
              title={STUDENT_STUDIO.kids}
              batches={kids}
              onBookTrial={onBookTrial}
            />
            <ClassGroup
              title={STUDENT_STUDIO.adults}
              batches={adults}
              onBookTrial={onBookTrial}
            />
          </div>
        </section>
      ) : null}

      {trainers.length > 0 ? (
        <section className={shared.section} aria-labelledby="studio-trainers">
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-trainers" className={shared.title}>
                {STUDENT_STUDIO.trainers}
              </h2>
            </Reveal>
            <ul className={styles.trainerGrid}>
              {trainers.map((trainer, index) => (
                <Reveal key={trainer.id} as="li" delay={index * 40}>
                  <TrainerCard trainer={trainer} />
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section
          className={`${shared.section} ${styles.band}`}
          aria-labelledby="studio-photos"
        >
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-photos" className={shared.title}>
                {STUDENT_STUDIO.photos}
              </h2>
              <div className={styles.gallery} data-count={gallery.length}>
                {gallery.map((item) => (
                  <img
                    key={item.url}
                    src={item.url}
                    alt={item.caption || `${studio.name} photo`}
                    className={styles.galleryImage}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      <WordReveal
        line1={STUDENT_STUDIO.taglineLine1}
        line2={STUDENT_STUDIO.taglineLine2}
      />

      {showVisit ? (
        <section className={shared.section} aria-labelledby="studio-visit">
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-visit" className={shared.title}>
                {STUDENT_STUDIO.visit}
              </h2>
            </Reveal>
            {branch?.coverUrl ? (
              <img className={styles.visitCover} src={branch.coverUrl} alt="" />
            ) : null}
            <div className={styles.visitGrid}>
              <div>
                {branch?.name && (studio.branches?.length ?? 0) > 1 ? (
                  <p className={styles.meta}>{branch.name}</p>
                ) : null}
                {branch?.description ? (
                  <p className={shared.lede}>{branch.description}</p>
                ) : null}
                {address ? <p className={styles.body}>{address}</p> : null}
                {branch?.latitude != null && branch.longitude != null ? (
                  <a
                    className={styles.textLink}
                    href={mapsUrl(branch.latitude, branch.longitude)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {STUDENT_STUDIO.maps}
                  </a>
                ) : null}
                {amenities.length > 0 ? (
                  <ul className={styles.chips}>
                    {amenities.map((id) => (
                      <li key={id}>{amenityLabel(id)}</li>
                    ))}
                  </ul>
                ) : null}
                {links.length > 0 ? (
                  <nav
                    className={styles.links}
                    aria-label={STUDENT_STUDIO.reach}
                  >
                    {links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target={
                          link.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          link.href.startsWith("http")
                            ? "noreferrer"
                            : undefined
                        }
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                ) : null}
              </div>
              <div>
                <HoursBlock hours={hours} />
                {branch?.pricingBlurb ? (
                  <p className={styles.body}>{branch.pricingBlurb}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section
          className={`${shared.section} ${styles.band}`}
          aria-labelledby="studio-reviews"
        >
          <div className={shared.sectionInner}>
            <Reveal>
              <h2 id="studio-reviews" className={shared.title}>
                {STUDENT_STUDIO.reviews}
              </h2>
            </Reveal>
            <ul className={styles.quotes}>
              {testimonials.map((item, index) => (
                <Reveal key={item.id} as="li" delay={index * 40}>
                  <figure className={styles.quote}>
                    <blockquote className={styles.quoteText}>
                      {item.quote}
                    </blockquote>
                    <figcaption className={styles.meta}>
                      {item.authorName}
                      {item.rating != null ? ` · ${item.rating}★` : ""}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section
        id="how-it-works"
        className={`${shared.section} ${howStyles.section}`}
        aria-labelledby="studio-how"
      >
        <div className={shared.sectionInner}>
          <Reveal>
            <h2 id="studio-how" className={shared.title}>
              {STUDENT_STUDIO.how.headline}
            </h2>
          </Reveal>
          <ol className={howStyles.steps}>
            {STUDENT_STUDIO.how.steps.map((step, index) => (
              <Reveal key={step.id} as="li" delay={index * 60}>
                <article className={howStyles.step}>
                  <span className={howStyles.number}>{step.number}</span>
                  <h3 className={howStyles.title}>{step.title}</h3>
                  <p className={howStyles.body}>{step.body}</p>
                </article>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section
        className={`${shared.section} ${faqStyles.faq}`}
        aria-labelledby="studio-faq"
      >
        <div className={shared.sectionInner}>
          <Reveal className={faqStyles.intro}>
            <h2 id="studio-faq" className={shared.title}>
              {STUDENT_STUDIO.faq}
            </h2>
          </Reveal>
          <StudioFaq items={faqItems} />
        </div>
      </section>

      <section
        className={`${shared.section} ${shared.inverted} ${styles.final}`}
        aria-labelledby="studio-final"
      >
        <div className={shared.sectionInner}>
          <Reveal>
            <h2 id="studio-final" className={shared.title}>
              {STUDENT_STUDIO.finalHeadline}
            </h2>
            <p className={shared.lede}>{STUDENT_STUDIO.finalSupport}</p>
            <div className={styles.finalCta}>
              <TouchButton variant="primary" onClick={() => onBookTrial()}>
                {STUDENT_TRIAL.cta}
              </TouchButton>
            </div>
          </Reveal>
        </div>
      </section>

      <div
        className={styles.dock}
        data-hidden={dockHidden || undefined}
        data-solo={!dockMeta || undefined}
      >
        {dockMeta ? <p className={styles.dockMeta}>{dockMeta}</p> : null}
        <TouchButton
          variant="primary"
          className={styles.dockCta}
          onClick={() => onBookTrial()}
        >
          {STUDENT_TRIAL.cta}
        </TouchButton>
      </div>
    </article>
  );
}

function HeroHeadline({ studio }: { studio: DiscoverStudioDetail }) {
  const place = studio.locality || studio.city;
  const style = studio.styles[0];
  if (style && place) {
    return (
      <>
        <span>{style} classes</span>
        <span>in {place}</span>
      </>
    );
  }
  if (place) {
    return (
      <>
        <span>Dance classes</span>
        <span>in {place}</span>
      </>
    );
  }
  return studio.name;
}

function ClassGroup({
  title,
  batches,
  onBookTrial,
}: {
  title: string;
  batches: DiscoverBatchSummary[];
  onBookTrial: (batchId?: string) => void;
}) {
  if (batches.length === 0) return null;
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel}>{title}</p>
      <ul className={styles.classGrid}>
        {batches.map((batch, index) => {
          const batchPrice = formatPriceFrom(
            batch.priceFrom,
            batch.priceCadence,
          );
          return (
            <Reveal key={batch.id} as="li" delay={index * 40}>
              <article
                className={
                  batch.coverImageUrl
                    ? styles.classCard
                    : `${styles.classCard} ${styles.classCardText}`
                }
              >
                {batch.coverImageUrl ? (
                  <img
                    className={styles.classCover}
                    src={batch.coverImageUrl}
                    alt=""
                  />
                ) : null}
                <div className={styles.classBody}>
                  <p className={styles.className}>{batch.name}</p>
                  <p className={styles.classMeta}>
                    {[batch.styles[0], batch.scheduleLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {(batch.trainers ?? []).length > 0 ? (
                    <p className={styles.classMeta}>
                      {(batch.trainers ?? [])
                        .map((trainer) => trainer.name)
                        .join(", ")}
                    </p>
                  ) : null}
                  {batchPrice ? (
                    <p className={styles.classPrice}>{batchPrice}</p>
                  ) : null}
                  <div className={styles.classCta}>
                    <TouchButton
                      variant="primary"
                      size="md"
                      fullWidth
                      onClick={() => onBookTrial(batch.id)}
                    >
                      {STUDENT_TRIAL.cta}
                    </TouchButton>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}

function TrainerCard({ trainer }: { trainer: DiscoverTrainer }) {
  return (
    <article className={styles.trainer}>
      <Avatar size="lg">
        {trainer.photoUrl ? (
          <AvatarImage src={trainer.photoUrl} alt="" />
        ) : null}
        <AvatarFallback>{trainer.name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <p className={styles.trainerName}>{trainer.name}</p>
      {trainer.styles.length > 0 ? (
        <p className={styles.meta}>{trainer.styles.join(" · ")}</p>
      ) : null}
      {trainer.bio ? <p className={styles.trainerBio}>{trainer.bio}</p> : null}
      {trainer.instagramUrl ? (
        <a
          className={styles.textLink}
          href={externalHref(trainer.instagramUrl)}
          target="_blank"
          rel="noreferrer"
        >
          @{instagramLabel(trainer.instagramUrl)}
        </a>
      ) : null}
    </article>
  );
}

function HoursBlock({ hours }: { hours: OpeningHours | null }) {
  if (!hours?.days?.length && !hours?.notes) return null;
  return (
    <div className={styles.hours}>
      <p className={styles.noteLabel}>{STUDENT_STUDIO.hours}</p>
      {hours.days?.length ? (
        <ul className={styles.hoursList}>
          {hours.days.map((day) => (
            <li key={day.day}>
              <span>{WEEKDAY_LABELS[day.day] ?? `Day ${day.day}`}</span>
              <span>
                {day.closed
                  ? STUDENT_STUDIO.closed
                  : day.open && day.close
                    ? STUDENT_STUDIO.hoursRange(day.open, day.close)
                    : STUDENT_STUDIO.closed}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {hours.notes ? <p className={styles.body}>{hours.notes}</p> : null}
    </div>
  );
}

function StudioFaq({
  items,
}: {
  items: Array<{ id: string; q: string; a: string }>;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={faqStyles.list}>
      {items.map((item, index) => (
        <Reveal key={item.id} delay={index * 30}>
          <FaqItem
            question={item.q}
            answer={item.a}
            open={openId === item.id}
            onToggle={() =>
              setOpenId((current) => (current === item.id ? null : item.id))
            }
          />
        </Reveal>
      ))}
    </div>
  );
}

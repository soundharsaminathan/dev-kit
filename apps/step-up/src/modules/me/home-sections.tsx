import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Icon, type IconName } from "@dev-ui/icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { resolveDanceStyle } from "@/lib/dance-styles";
import { NotificationsControl } from "@/modules/layout/app-header";
import { AnimatedMetric } from "@/modules/ui/animated-metric";
import { HScrollRow } from "@/modules/ui/h-scroll-row";
import { TooltipIconBar } from "@/modules/ui/tooltip-icon-bar";
import { ChildSwitcher } from "./child-switcher";
import styles from "./home-sections.module.scss";
import type {
  HomeAchievement,
  HomeBanner,
  HomeInstructor,
  HomeMembership,
  HomeNextClass,
  HomePayload,
  HomeProgressItem,
  HomeTimelineItem,
} from "./home-types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdownBadge(ms: number) {
  if (ms <= 0) return "Now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d · ${hours}h`;
  if (hours > 0) return `${hours}h · ${minutes}m`;
  return `${minutes}m`;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Starting now";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `Starts in ${minutes}m`;
  return `Starts in ${hours}h ${minutes}m`;
}

export function HomeStudioBanner({
  banner,
  studioName,
  greeting,
  firstName,
  title,
  cta,
  variant = "me",
  flushTop = false,
}: {
  banner: HomeBanner | null;
  studioName?: string | null;
  greeting?: string;
  firstName?: string;
  title?: string;
  cta?: { label: string; to: string; icon?: IconName } | null;
  variant?: "me" | "app";
  flushTop?: boolean;
}) {
  const navigate = useNavigate();
  const headline =
    title ?? `${greeting ?? "Hey"}, ${firstName ?? "dancer"} — let's dance`;

  return (
    <section
      className={`${styles.studioBanner} ${styles.sectionEnter}`}
      data-delay="0"
      data-flush-top={flushTop ? "true" : undefined}
    >
      <div className={styles.studioBannerMedia}>
        {banner?.imageUrl ? (
          <img
            className={styles.studioBannerImage}
            src={banner.imageUrl}
            alt={banner.altText ?? banner.branchName ?? ""}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className={styles.studioBannerFallback} aria-hidden />
        )}
        <div className={styles.studioBannerScrim} aria-hidden />
      </div>
      <div className={styles.studioBannerTop}>
        {variant === "me" ? <ChildSwitcher tone="onMedia" /> : null}
        <div className={styles.studioBannerActions}>
          <TooltipIconBar placement="bottom">
            <NotificationsControl variant={variant} tone="onMedia" />
          </TooltipIconBar>
        </div>
      </div>
      <div className={styles.studioBannerCopy}>
        <p className={styles.studioBannerEyebrow}>
          {studioName ?? "Your studio"}
          {banner?.branchName ? ` · ${banner.branchName}` : ""}
        </p>
        <h1 className={styles.studioBannerTitle}>{headline}</h1>
      </div>
      {cta ? (
        <button
          type="button"
          className={styles.studioBannerPill}
          onClick={() => {
            void navigate({ to: cta.to as "/me/book" });
          }}
        >
          <Icon name={cta.icon ?? "search"} />
          <span>
            <strong>{cta.label}</strong>
          </span>
        </button>
      ) : null}
    </section>
  );
}

export function HomeGreeting({
  greeting,
  name,
  studioName,
  photoUrl,
  membership,
}: {
  greeting: string;
  name: string;
  studioName?: string | null;
  photoUrl?: string | null;
  membership?: HomeMembership | null;
}) {
  const firstName = name.split(" ")[0] || "dancer";
  return (
    <div className={styles.sectionEnter} data-delay="0">
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Avatar size="lg">
          {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
          <AvatarFallback>{firstName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className={styles.heroEyebrow}
            style={{ color: "inherit", opacity: 0.55 }}
          >
            {studioName ?? "Your studio"}
          </p>
          <h1
            className={styles.heroTitle}
            style={{ color: "inherit", fontSize: "1.375rem" }}
          >
            {greeting}, {firstName}
          </h1>
          <p
            className={styles.heroSubtitle}
            style={{ color: "inherit", opacity: 0.7 }}
          >
            Ready for your next dance session?
          </p>
        </div>
        {membership ? (
          <span
            className={styles.communityTag}
            style={
              membership.needsRenewal
                ? {
                    background:
                      "color-mix(in srgb, var(--color-warning) 18%, transparent)",
                    color: "var(--color-warning)",
                  }
                : undefined
            }
          >
            {membership.needsRenewal ? "Renew" : "Active"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function HomeHeroCard({ hero }: { hero: HomePayload["hero"] }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (hero.kind !== "nextClass" || !hero.nextClass) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [hero.kind, hero.nextClass]);

  const countdown =
    hero.nextClass != null
      ? formatCountdown(new Date(hero.nextClass.startsAt).getTime() - now)
      : null;

  return (
    <button
      type="button"
      className={`${styles.hero} ${styles.sectionEnter}`}
      data-delay="1"
      onClick={() => {
        if (hero.cta?.to) {
          void navigate({ to: hero.cta.to as "/me/book" });
        }
      }}
    >
      <p className={styles.heroEyebrow}>
        {hero.kind === "nextClass"
          ? "Next class"
          : hero.kind === "streak"
            ? "Streak"
            : hero.kind === "membership"
              ? "Membership"
              : "Get started"}
      </p>
      <h2 className={styles.heroTitle}>
        {hero.kind === "streak" ? (
          <span className={styles.streakPulse} data-active="true">
            <Icon name="zap" /> {hero.title}
          </span>
        ) : (
          hero.title
        )}
      </h2>
      <p className={styles.heroSubtitle}>{hero.subtitle}</p>
      {countdown ? <p className={styles.countdown}>{countdown}</p> : null}
      {hero.meta ? <p className={styles.heroMeta}>{hero.meta}</p> : null}
      {hero.cta ? (
        <span className={styles.heroCta}>{hero.cta.label}</span>
      ) : null}
    </button>
  );
}

export function UpcomingClassCard({
  nextClass,
  membership,
}: {
  nextClass: HomeNextClass;
  membership?: HomeMembership | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ms = new Date(nextClass.startsAt).getTime() - now;

  return (
    <Link
      to="/me/batches/$id"
      params={{ id: nextClass.batchId }}
      className={`${styles.upcomingCard} ${styles.sectionEnter}`}
      data-delay="1"
    >
      <div className={styles.upcomingHeader}>
        <p className={styles.sectionEyebrow}>Upcoming class</p>
        <span className={styles.countdownBadge}>
          {formatCountdownBadge(ms)}
        </span>
      </div>
      {nextClass.coverImageUrl ? (
        <img
          className={styles.upcomingCover}
          src={nextClass.coverImageUrl}
          alt=""
          loading="lazy"
        />
      ) : (
        <div className={styles.upcomingCoverFallback} aria-hidden />
      )}
      <div className={styles.upcomingBody}>
        <p className={styles.timelineTitle}>{nextClass.batchName}</p>
        <p className={styles.timelineMeta}>
          {formatTime(nextClass.startsAt)}
          {nextClass.branchName ? ` · ${nextClass.branchName}` : ""}
          {membership?.needsRenewal ? " · Renew soon" : ""}
        </p>
      </div>
    </Link>
  );
}

export function TrialPromoCard({
  title,
  subtitle,
  ctaLabel,
  to = "/me/book",
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  to?: string;
}) {
  return (
    <Link
      to={to as "/me/book"}
      className={`${styles.trialCard} ${styles.sectionEnter}`}
      data-delay="1"
    >
      <p className={styles.sectionEyebrow}>New here?</p>
      <p className={styles.timelineTitle}>{title}</p>
      <p className={styles.timelineMeta}>{subtitle}</p>
      <span className={styles.trialCta}>{ctaLabel}</span>
    </Link>
  );
}

export function InstructorsRow({
  instructors,
}: {
  instructors: HomeInstructor[];
}) {
  if (instructors.length === 0) return null;

  return (
    <HScrollRow aria-label="Top instructors">
      {instructors.map((instructor, index) => {
        const firstName = instructor.name.split(" ")[0] || instructor.name;
        const danceStyle = instructor.styleBadge
          ? resolveDanceStyle(instructor.styleBadge)
          : null;
        const fallbackEmoji =
          danceStyle?.emoji ?? (index % 2 === 0 ? "🕺" : "💃");

        return (
          <Link
            key={instructor.id}
            to="/users/$id"
            params={{ id: instructor.id }}
            className={styles.instructorCard}
            role="listitem"
            aria-label={
              instructor.styleBadge
                ? `${instructor.name}, ${instructor.styleBadge}`
                : instructor.name
            }
          >
            {instructor.photoUrl ? (
              <img
                src={instructor.photoUrl}
                alt=""
                className={styles.instructorImage}
                loading="lazy"
              />
            ) : (
              <div
                className={styles.instructorFallback}
                style={
                  danceStyle
                    ? ({
                        "--instructor-style-color": danceStyle.color,
                      } as React.CSSProperties)
                    : undefined
                }
                aria-hidden
              >
                <span className={styles.instructorFallbackEmoji}>
                  {fallbackEmoji}
                </span>
              </div>
            )}
            <span className={styles.instructorScrim} aria-hidden />
            <span className={styles.instructorCopy}>
              <span className={styles.instructorName}>{firstName}</span>
              {instructor.styleBadge ? (
                <span className={styles.instructorMeta}>
                  {instructor.styleBadge}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </HScrollRow>
  );
}

export function TodayTimeline({ items }: { items: HomeTimelineItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.timeline} ${styles.sectionEnter}`} data-delay="2">
      {items.map((item, index) => (
        <div key={item.id} className={styles.timelineItem}>
          <div className={styles.timelineRail}>
            <span className={styles.timelineDot} data-state={item.state} />
            {index < items.length - 1 ? (
              <span className={styles.timelineLine} />
            ) : null}
          </div>
          <div>
            <p className={styles.timelineTitle}>{item.title}</p>
            <p className={styles.timelineMeta}>
              {item.state === "completed"
                ? "Completed"
                : item.state === "now"
                  ? "Happening now"
                  : formatTime(item.startsAt)}
              {item.branchName ? ` · ${item.branchName}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickActionsGrid({
  primary,
  items,
}: {
  primary: HomePayload["quickActions"]["primary"];
  items: HomePayload["quickActions"]["items"];
}) {
  return (
    <div
      className={`${styles.quickGrid} ${styles.sectionEnter}`}
      data-delay="2"
    >
      {items.map((item) => {
        const isPrimary = item.to === primary.to;
        return (
          <Link
            key={item.to}
            to={item.to as "/me/book"}
            className={styles.quickCard}
            data-primary={isPrimary ? "true" : undefined}
          >
            <span className={styles.quickIcon}>
              <Icon name={item.icon as IconName} />
            </span>
            {isPrimary ? primary.label : item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function BatchProgressCard({ item }: { item: HomeProgressItem }) {
  return (
    <Link
      to="/me/batches/$id"
      params={{ id: item.batchId }}
      className={styles.progressCard}
      role="listitem"
    >
      <div>
        <p
          className={styles.heroEyebrow}
          style={{ color: "inherit", opacity: 0.55 }}
        >
          Keep going
        </p>
        <p className={styles.timelineTitle}>{item.batchName}</p>
        {item.styleBadge ? (
          <p className={styles.timelineMeta}>{item.styleBadge}</p>
        ) : null}
      </div>
      <div className={styles.progressBar} aria-hidden>
        <div
          className={styles.progressFill}
          style={{ width: `${item.percent}%` }}
        />
      </div>
      <p className={styles.timelineMeta}>
        {item.attendedSessions}/{item.totalSessions} sessions
        {item.nextLesson
          ? ` · Next ${formatTime(item.nextLesson.startsAt)}`
          : ""}
      </p>
    </Link>
  );
}

export function JourneyStats({ stats }: { stats: HomePayload["stats"] }) {
  return (
    <div className={`${styles.statsRow} ${styles.sectionEnter}`} data-delay="3">
      <div className={styles.statCard}>
        <span className={styles.statValue}>
          <AnimatedMetric value={stats.streak} />
        </span>
        <span className={styles.statLabel}>Day streak</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>
          <AnimatedMetric value={stats.sessionsCompleted} />
        </span>
        <span className={styles.statLabel}>Classes done</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>
          <AnimatedMetric value={stats.monthlySessions} />
        </span>
        <span className={styles.statLabel}>This month</span>
      </div>
    </div>
  );
}

export function GoalRing({
  goal,
  onOpen,
  menu,
}: {
  goal: HomePayload["goal"];
  onOpen?: () => void;
  menu?: ReactNode;
}) {
  const percent = Math.min(
    100,
    Math.round((goal.current / Math.max(goal.target, 1)) * 100),
  );
  const interactive = Boolean(onOpen) && !menu;

  return (
    <div
      className={`${styles.goalCard} ${styles.sectionEnter}`}
      data-delay="3"
      data-interactive={interactive ? "true" : "false"}
    >
      {interactive ? (
        <button
          type="button"
          className={styles.goalHit}
          onClick={onOpen}
          aria-label="Update monthly goal"
        />
      ) : null}
      <div
        className={styles.goalRing}
        style={{ ["--progress" as string]: percent }}
      >
        <div className={styles.goalRingInner}>{percent}%</div>
      </div>
      <div className={styles.goalCopy}>
        <p className={styles.timelineTitle}>Monthly goal</p>
        <p className={styles.timelineMeta}>
          {goal.current} of {goal.target} sessions
        </p>
        {interactive ? (
          <p className={styles.timelineMeta}>Tap to update</p>
        ) : null}
      </div>
      {menu ? <div className={styles.goalMenu}>{menu}</div> : null}
    </div>
  );
}

export function AchievementBadge({ item }: { item: HomeAchievement }) {
  return (
    <li
      className={styles.badge}
      data-earned={item.earnedAt ? "true" : undefined}
      title={item.description}
    >
      <span className={styles.badgeIcon}>
        <Icon name={(item.icon as IconName) || "star"} />
      </span>
      <p className={styles.badgeTitle}>{item.title}</p>
    </li>
  );
}

export function CommunityCard({
  title,
  meta,
  to,
  tag,
}: {
  title: string;
  meta: string;
  to: string;
  tag: string;
}) {
  return (
    <Link
      to={to as "/me/feed"}
      className={styles.communityCard}
      role="listitem"
    >
      <span className={styles.communityTag}>{tag}</span>
      <p className={styles.timelineTitle}>{title}</p>
      <p className={styles.timelineMeta}>{meta}</p>
    </Link>
  );
}

export function RecommendedRow({
  items,
}: {
  items: HomePayload["recommendations"];
}) {
  const cards = useMemo(
    () =>
      items.map((batch) => ({
        id: batch.id,
        name: batch.name,
        coverImageUrl: batch.coverImageUrl,
        styleBadge: batch.styleBadge,
        ratingAvg: batch.ratingAvg,
        remainingSeats: batch.remainingSeats,
        priceMonthly: batch.priceMonthly,
        scheduleLabel: batch.scheduleLabel,
        trainers: (batch.trainers ?? [])
          .map((row) => row.trainer)
          .filter(Boolean)
          .map((trainer) => ({
            id: trainer!.id,
            name: trainer!.name,
            photoUrl: trainer!.photoUrl,
          })),
      })),
    [items],
  );

  if (cards.length === 0) return null;

  return (
    <HScrollRow aria-label="Recommended classes">
      {cards.map((batch) => (
        <Link
          key={batch.id}
          to="/me/batches/$id"
          params={{ id: batch.id }}
          className={styles.progressCard}
          role="listitem"
          style={{ width: "15rem" }}
        >
          {batch.coverImageUrl ? (
            <img
              src={batch.coverImageUrl}
              alt=""
              loading="lazy"
              style={{
                width: "100%",
                height: "6.5rem",
                objectFit: "cover",
                borderRadius: "var(--radius-xl, 1rem)",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "6.5rem",
                borderRadius: "var(--radius-xl, 1rem)",
                background:
                  "color-mix(in srgb, var(--color-primary) 16%, transparent)",
              }}
            />
          )}
          <p className={styles.timelineTitle}>{batch.name}</p>
          <p className={styles.timelineMeta}>
            {[batch.styleBadge, batch.scheduleLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Link>
      ))}
    </HScrollRow>
  );
}

export function NextClassMeta({ nextClass }: { nextClass: HomeNextClass }) {
  return (
    <p className={styles.timelineMeta}>
      {formatTime(nextClass.startsAt)}
      {nextClass.branchName ? ` · ${nextClass.branchName}` : ""}
    </p>
  );
}

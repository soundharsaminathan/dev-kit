import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { MEMBER_ROLES } from "@/lib/constants";
import { danceStyleLabel } from "@/lib/dance-styles";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioDanceStyles } from "@/lib/use-studio-dance-styles";
import type { ChatConversation } from "@/modules/chat/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { EmptyState } from "@/modules/ui/states";
import styles from "./trainer-discovery.module.scss";
import type { StudioTrainer } from "./types";

function stopCardDrag(event: ReactPointerEvent) {
  event.stopPropagation();
}

type TrainerDiscoveryViewProps = {
  trainers: StudioTrainer[];
  isFollowPending?: ((trainerId: string) => boolean) | undefined;
  onToggleFollow?: ((trainer: StudioTrainer) => void) | undefined;
  studioName?: string | null | undefined;
  branchName?: string | null | undefined;
  onOpenListView?: (() => void) | undefined;
};

const DRAG_X = 88;
const DRAG_Y = 100;
const VELOCITY_X = 480;
const VELOCITY_Y = 650;
const EXIT_X = 280;
const PROFILE_EXIT_MS = 240;

const SPRING_CARD = {
  type: "spring" as const,
  stiffness: 420,
  damping: 42,
  mass: 0.65,
};

const SPRING_SNAP = {
  type: "spring" as const,
  stiffness: 520,
  damping: 44,
  mass: 0.55,
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function handleLabel(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `@${base.slice(0, 12) || "instructor"}`;
}

function locationLine(studioName?: string | null, branchName?: string | null) {
  if (studioName && branchName) return `${branchName} · ${studioName}`;
  if (branchName) return branchName;
  if (studioName) return studioName;
  return null;
}

export function TrainerDiscoveryView({
  trainers,
  isFollowPending,
  onToggleFollow,
  studioName,
  branchName,
  onOpenListView,
}: TrainerDiscoveryViewProps) {
  const api = useApi();
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { toast } = useToastContext("TrainerDiscoveryView");
  const { styles: danceCatalog } = useStudioDanceStyles();
  const reducedMotion = useReducedMotion() ?? false;
  const [activeTrainerId, setActiveTrainerId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitDirection, setExitDirection] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [heartBurst, setHeartBurst] = useState(false);
  const [profileExit, setProfileExit] = useState(false);
  const carouselRef = useRef<HTMLUListElement>(null);
  const profileExitTimerRef = useRef<number | undefined>(undefined);

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const cardRotate = useTransform(
    dragX,
    [-220, 0, 220],
    reducedMotion ? [0, 0, 0] : [-7, 0, 7],
  );
  const photoX = useTransform(
    dragX,
    [-200, 0, 200],
    reducedMotion ? [0, 0, 0] : [-22, 0, 22],
  );
  const photoY = useTransform(
    dragY,
    [-160, 0, 160],
    reducedMotion ? [0, 0, 0] : [-12, 0, 12],
  );
  const photoScale = useTransform(
    dragY,
    [-160, 0],
    reducedMotion ? [1.06, 1.06] : [1.14, 1.06],
  );
  const profileCueOpacity = useTransform(
    dragY,
    [-DRAG_Y * 1.05, -42, 0],
    reducedMotion ? [0, 0, 0] : [1, 0.55, 0],
  );
  const profileCueY = useTransform(
    dragY,
    [-DRAG_Y, 0],
    reducedMotion ? [0, 0] : [0, 16],
  );

  const index = useMemo(() => {
    if (activeTrainerId) {
      const matched = trainers.findIndex((item) => item.id === activeTrainerId);
      if (matched >= 0) return matched;
    }
    return 0;
  }, [activeTrainerId, trainers]);

  useEffect(() => {
    if (trainers.length === 0) {
      setActiveTrainerId(null);
      return;
    }
    if (
      activeTrainerId &&
      trainers.some((item) => item.id === activeTrainerId)
    ) {
      return;
    }
    setActiveTrainerId(trainers[0]?.id ?? null);
  }, [activeTrainerId, trainers]);

  useEffect(() => {
    setHeartBurst(false);
    setProfileExit(false);
    if (profileExitTimerRef.current !== undefined) {
      window.clearTimeout(profileExitTimerRef.current);
      profileExitTimerRef.current = undefined;
    }
  }, [activeTrainerId]);

  useEffect(() => {
    return () => {
      if (profileExitTimerRef.current !== undefined) {
        window.clearTimeout(profileExitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  const trainer = trainers[index] ?? null;

  useEffect(() => {
    if (!activeTrainerId) return;
    const node = carouselRef.current;
    if (!node) return;
    const active = node.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;

    const nodeRect = node.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const target =
      node.scrollLeft +
      (activeRect.left - nodeRect.left) -
      (node.clientWidth - activeRect.width) / 2;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    const left = Math.max(0, Math.min(target, maxScroll));

    node.scrollTo({
      left,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [activeTrainerId, reducedMotion]);
  const location = useMemo(
    () => locationLine(studioName, branchName),
    [studioName, branchName],
  );

  const messageMutation = useMutation({
    mutationFn: (trainerId: string) =>
      api.post<ChatConversation>("/chat/conversations", {
        type: "DM",
        memberIds: [trainerId],
      }),
    onSuccess: (conversation) => {
      if (!user) return;
      const to = MEMBER_ROLES.includes(user.role)
        ? "/me/messages/$id"
        : "/app/messages/$id";
      void navigate({ to, params: { id: conversation.id } });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t start chat",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    },
  });

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void navigate({ to: "/me" });
  }

  function openProfile(trainerId: string, options?: { animated?: boolean }) {
    if (profileExit) return;

    if (options?.animated && !reducedMotion) {
      resetDrag();
      setShowHint(false);
      setProfileExit(true);
      profileExitTimerRef.current = window.setTimeout(() => {
        void navigate({ to: "/users/$id", params: { id: trainerId } });
      }, PROFILE_EXIT_MS);
      return;
    }

    void navigate({ to: "/users/$id", params: { id: trainerId } });
  }

  function resetDrag() {
    dragX.set(0);
    dragY.set(0);
  }

  function goTo(next: number, direction: number) {
    const nextTrainer = trainers[next];
    if (!nextTrainer || next === index) {
      resetDrag();
      return false;
    }
    setExitDirection(direction);
    setActiveTrainerId(nextTrainer.id);
    setShowHint(false);
    resetDrag();
    return true;
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;

    if (offset.y < -DRAG_Y || velocity.y < -VELOCITY_Y) {
      if (trainer) openProfile(trainer.id, { animated: true });
      else resetDrag();
      return;
    }

    if (offset.x < -DRAG_X || velocity.x < -VELOCITY_X) {
      goTo(Math.min(index + 1, trainers.length - 1), 1);
      return;
    }

    if (offset.x > DRAG_X || velocity.x > VELOCITY_X) {
      goTo(Math.max(index - 1, 0), -1);
      return;
    }

    resetDrag();
  }

  if (trainers.length === 0) {
    return (
      <EmptyState
        icon={ENTITY_ICONS.trainer}
        title="No instructors yet"
        description="Instructor profiles will show up here once your studio publishes them."
      />
    );
  }

  if (!trainer) return null;

  const imageUrl = trainer.bannerUrl ?? trainer.photoUrl;
  const favoriteActive =
    trainer.isFollowing || trainer.followRequestStatus === "PENDING";
  const favoritePending = isFollowPending?.(trainer.id) ?? false;

  return (
    <section className={styles.root} aria-label="Instructor discovery">
      <div className={styles.stage}>
        <AnimatePresence initial={false} custom={exitDirection}>
          <motion.article
            key={trainer.id}
            className={styles.card}
            drag={!reducedMotion && !profileExit}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.72}
            dragTransition={{
              bounceStiffness: SPRING_SNAP.stiffness,
              bounceDamping: SPRING_SNAP.damping,
            }}
            style={reducedMotion ? {} : { rotate: cardRotate }}
            onDrag={(_, info) => {
              dragX.set(info.offset.x);
              dragY.set(info.offset.y);
            }}
            onDragEnd={handleDragEnd}
            custom={exitDirection}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    x: exitDirection >= 0 ? EXIT_X * 0.45 : -EXIT_X * 0.45,
                    scale: 0.97,
                  }
            }
            animate={
              profileExit
                ? reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -88, scale: 0.97 }
                : { opacity: 1, x: 0, y: 0, scale: 1 }
            }
            exit={
              reducedMotion
                ? { opacity: 0, transition: { duration: 0.16 } }
                : {
                    opacity: 0,
                    x: exitDirection >= 0 ? -EXIT_X : EXIT_X,
                    scale: 0.96,
                    transition: { duration: 0.28, ease: EASE_OUT },
                  }
            }
            transition={
              profileExit
                ? { duration: 0.22, ease: EASE_OUT }
                : reducedMotion
                  ? { duration: 0.18 }
                  : SPRING_CARD
            }
          >
            <div className={styles.photoWrap}>
              {imageUrl ? (
                <motion.img
                  src={imageUrl}
                  alt=""
                  className={styles.photo}
                  style={{
                    x: photoX,
                    y: photoY,
                    scale: photoScale,
                  }}
                  draggable={false}
                />
              ) : (
                <div className={styles.photoFallback} aria-hidden>
                  <span className={styles.photoFallbackLetter}>
                    {trainer.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div className={styles.gradient} aria-hidden />
              <div className={styles.vignette} aria-hidden />
            </div>

            <div className={styles.chrome}>
              {!reducedMotion ? (
                <motion.p
                  className={styles.profileCue}
                  style={{ opacity: profileCueOpacity, y: profileCueY }}
                  aria-hidden
                >
                  <Icon name="chevron-up" aria-hidden />
                  View profile
                </motion.p>
              ) : null}

              <header className={styles.topNav} onPointerDown={stopCardDrag}>
                <button
                  type="button"
                  className={styles.glassIcon}
                  aria-label="Back"
                  onClick={goBack}
                >
                  <Icon name="arrow-left" aria-hidden />
                </button>

                <div
                  className={styles.progress}
                  role="tablist"
                  aria-label="Instructors"
                >
                  {trainers.map((item, itemIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={itemIndex === index}
                      aria-label={`Show ${item.name}`}
                      className={styles.progressSeg}
                      data-active={itemIndex === index ? "true" : undefined}
                      onClick={() =>
                        goTo(itemIndex, itemIndex > index ? 1 : -1)
                      }
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.glassIcon}
                  aria-label="More options"
                  onClick={() => setMenuOpen(true)}
                >
                  <Icon name="more-horizontal" aria-hidden />
                </button>
              </header>

              {!trainer.isOwnProfile ? (
                <div className={styles.actions} onPointerDown={stopCardDrag}>
                  {onToggleFollow ? (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      data-active={favoriteActive ? "true" : undefined}
                      data-burst={heartBurst ? "true" : undefined}
                      aria-label={
                        favoriteActive
                          ? `Unfavorite ${trainer.name}`
                          : `Favorite ${trainer.name}`
                      }
                      aria-pressed={favoriteActive}
                      aria-busy={favoritePending || undefined}
                      disabled={profileExit}
                      onClick={() => {
                        if (!favoriteActive && !reducedMotion) {
                          setHeartBurst(false);
                          requestAnimationFrame(() => setHeartBurst(true));
                        }
                        onToggleFollow(trainer);
                      }}
                      onAnimationEnd={() => setHeartBurst(false)}
                    >
                      <Icon name="heart" aria-hidden />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-label={`Message ${trainer.name}`}
                    disabled={messageMutation.isPending || profileExit}
                    onClick={() => messageMutation.mutate(trainer.id)}
                  >
                    <Icon name="message-square" aria-hidden />
                  </button>
                </div>
              ) : null}

              <div className={styles.body}>
                <div className={styles.info}>
                  <h1 className={styles.name}>{trainer.name}</h1>

                  {location ? (
                    <p className={styles.location}>
                      <Icon name="map-pin" aria-hidden />
                      <span>{location}</span>
                    </p>
                  ) : null}

                  <p className={styles.stats}>
                    <span className={styles.stat}>
                      <Icon name="users" aria-hidden />
                      {trainer.followerCount.toLocaleString()} students
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={trainer.isFollowing ? "following" : "available"}
                        className={styles.status}
                        data-following={
                          trainer.isFollowing ? "true" : undefined
                        }
                        initial={
                          reducedMotion
                            ? false
                            : { opacity: 0, y: 5, scale: 0.96 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        {...(reducedMotion
                          ? {}
                          : {
                              exit: {
                                opacity: 0,
                                y: -4,
                                scale: 0.98,
                              },
                            })}
                        transition={{ duration: 0.18, ease: EASE_OUT }}
                      >
                        <span className={styles.statusDot} aria-hidden />
                        {trainer.isFollowing ? "Following" : "Available"}
                      </motion.span>
                    </AnimatePresence>
                  </p>

                  {trainer.styles.length > 0 ? (
                    <ul className={styles.chips} aria-label="Dance styles">
                      {trainer.styles.map((style) => (
                        <li key={style} className={styles.chip}>
                          {danceStyleLabel(style, danceCatalog)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <footer className={styles.footer} onPointerDown={stopCardDrag}>
                {trainers.length > 1 ? (
                  <ul
                    ref={carouselRef}
                    className={styles.carousel}
                    aria-label="Browse instructors"
                  >
                    {trainers.map((item, itemIndex) => {
                      const active = itemIndex === index;
                      const thumb = item.photoUrl ?? item.bannerUrl;
                      return (
                        <li key={item.id} className={styles.avatarItem}>
                          <button
                            type="button"
                            data-active={active ? "true" : undefined}
                            aria-label={item.name}
                            aria-current={active ? "true" : undefined}
                            onClick={() =>
                              goTo(itemIndex, itemIndex > index ? 1 : -1)
                            }
                          >
                            <span className={styles.avatarRing}>
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className={styles.avatarImg}
                                />
                              ) : (
                                <span className={styles.avatarFallback}>
                                  {item.name.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <span className={styles.avatarLabel}>
                              {active
                                ? handleLabel(item.name)
                                : firstName(item.name)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => openProfile(trainer.id)}
                >
                  View Profile
                  <Icon name="arrow-up-right" aria-hidden />
                </button>
              </footer>
            </div>
          </motion.article>
        </AnimatePresence>

        {showHint && trainers.length > 1 && !reducedMotion && !profileExit ? (
          <p className={styles.hint}>Swipe up · browse avatars</p>
        ) : null}
      </div>

      <AppSheet
        isOpen={menuOpen}
        onOpenChange={setMenuOpen}
        title="Instructors"
      >
        <div className={styles.sheetBody}>
          <p className={styles.sheetHint}>
            Discover premium instructors with full-screen profiles. Switch to
            list for a quicker browse.
          </p>
          <div className={styles.sheetActions}>
            {onOpenListView ? (
              <button
                type="button"
                className={styles.sheetBtn}
                onClick={() => {
                  setMenuOpen(false);
                  onOpenListView();
                }}
              >
                <Icon name="list" aria-hidden />
                Switch to list view
              </button>
            ) : null}
            <button
              type="button"
              className={styles.sheetBtn}
              onClick={() => {
                setMenuOpen(false);
                void navigate({ to: "/me/book" });
              }}
            >
              <Icon name="search" aria-hidden />
              Book a trial class
            </button>
            {trainer ? (
              <button
                type="button"
                className={styles.sheetBtn}
                onClick={() => {
                  setMenuOpen(false);
                  openProfile(trainer.id);
                }}
              >
                <Icon name="user" aria-hidden />
                Open {firstName(trainer.name)}&apos;s profile
              </button>
            ) : null}
          </div>
        </div>
      </AppSheet>
    </section>
  );
}

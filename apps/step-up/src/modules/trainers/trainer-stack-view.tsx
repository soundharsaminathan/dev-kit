import { Icon } from "@dev-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import {
  type MotionValue,
  motion,
  type PanInfo,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useState } from "react";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { FollowButton } from "@/modules/social/follow-button";
import { StyleList } from "@/modules/styles/style-list";
import { EmptyState } from "@/modules/ui/states";
import { FollowCounts } from "./follow-counts";
import styles from "./trainers.module.scss";
import type { StudioTrainer } from "./types";

type TrainerStackViewProps = {
  trainers: StudioTrainer[];
  isFollowPending?: ((trainerId: string) => boolean) | undefined;
  onToggleFollow?: ((trainer: StudioTrainer) => void) | undefined;
  selectionMode?: boolean;
  selectedId?: string | null;
  onSelect?: ((trainerId: string) => void) | undefined;
  compact?: boolean;
};

const DRAG_BUFFER = 60;
const VELOCITY_THRESHOLD = 500;
const SPRING = { type: "spring" as const, stiffness: 300, damping: 40 };

type StackCardProps = {
  trainer: StudioTrainer;
  index: number;
  x: MotionValue<number>;
  cardWidth: number;
  gap: number;
  reducedMotion: boolean;
  followPending?: boolean | undefined;
  selected?: boolean;
  selectionMode?: boolean;
  compact?: boolean;
  onOpen: () => void;
  onSelect?: (() => void) | undefined;
  onToggleFollow?: (() => void) | undefined;
};

function StackCard({
  trainer,
  index,
  x,
  cardWidth,
  gap,
  reducedMotion,
  followPending,
  selected,
  selectionMode,
  compact,
  onOpen,
  onSelect,
  onToggleFollow,
}: StackCardProps) {
  const center = -(index * (cardWidth + gap));
  const distance = useTransform(x, (value) => value - center);

  const rotate = useTransform(
    distance,
    [-cardWidth, -cardWidth * 0.1, 0, cardWidth * 0.1, cardWidth],
    reducedMotion ? [0, 0, 0, 0, 0] : [10, 10, 0, -10, -10],
  );

  const blur = useTransform(
    distance,
    [-cardWidth, -cardWidth * 0.2, 0, cardWidth * 0.2, cardWidth],
    reducedMotion ? [0, 0, 0, 0, 0] : [4, 2, 0, 2, 4],
  );

  const opacity = useTransform(
    distance,
    [-cardWidth, -cardWidth * 0.2, 0, cardWidth * 0.2, cardWidth],
    [0, 0.8, 1, 0.8, 0],
  );

  const filter = useMotionTemplate`blur(${blur}px)`;
  const imageUrl = trainer.bannerUrl ?? trainer.photoUrl;

  return (
    <motion.article
      style={{
        opacity,
        rotate,
        filter: reducedMotion ? undefined : filter,
        minWidth: cardWidth,
      }}
      className={styles.stackCard}
      data-compact={compact ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
    >
      <div
        className={styles.stackCardPhoto}
        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
        data-fallback={imageUrl ? undefined : "true"}
      >
        {imageUrl ? null : (
          <span className={styles.stackPhotoFallback} aria-hidden>
            {trainer.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className={styles.stackCardContent}>
        <h2 className={styles.stackName}>{trainer.name}</h2>
        {!selectionMode ? (
          <div className={styles.stackFollowCounts}>
            <FollowCounts
              followerCount={trainer.followerCount}
              followingCount={trainer.followingCount}
              compact
            />
          </div>
        ) : null}
        {trainer.styles.length > 0 ? (
          <StyleList
            styles={trainer.styles}
            size="xs"
            className={styles.stackStyleList}
          />
        ) : (
          <p className={styles.stackEmpty}>No styles listed yet</p>
        )}
        {selectionMode && onSelect ? (
          <div className={styles.stackFollowAction}>
            <button
              type="button"
              className={styles.stackSelectBtn}
              data-selected={selected ? "true" : undefined}
              onClick={onSelect}
            >
              {selected ? "Selected" : "Select"}
            </button>
          </div>
        ) : null}
        {!selectionMode && !trainer.isOwnProfile && onToggleFollow ? (
          <div className={styles.stackFollowAction}>
            <FollowButton
              isFollowing={trainer.isFollowing}
              followRequestStatus={trainer.followRequestStatus}
              isPending={followPending}
              onFollow={onToggleFollow}
              onUnfollow={onToggleFollow}
            />
          </div>
        ) : null}
      </div>

      {selectionMode ? null : (
        <button
          type="button"
          className={styles.stackOpenBtn}
          aria-label={`Open ${trainer.name}'s profile`}
          onClick={onOpen}
        >
          <Icon name="arrow-up-right" aria-hidden />
        </button>
      )}
    </motion.article>
  );
}

export function TrainerStackView({
  trainers,
  isFollowPending,
  onToggleFollow,
  selectionMode = false,
  selectedId = null,
  onSelect,
  compact = false,
}: TrainerStackViewProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [dimensions, setDimensions] = useState({ cardWidth: 320, gap: 200 });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDimensions({
          cardWidth: Math.min(width - 64, compact ? 280 : 300),
          gap: 40,
        });
      } else {
        setDimensions({
          cardWidth: compact ? 280 : 320,
          gap: compact ? 48 : 200,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [compact]);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(trainers.length - 1, 0)));
  }, [trainers]);

  useEffect(() => {
    if (!selectionMode || !onSelect) return;
    const trainer = trainers[index];
    if (trainer) onSelect(trainer.id);
  }, [index, onSelect, selectionMode, trainers]);

  const { cardWidth, gap } = dimensions;
  const x = useMotionValue(-(index * (cardWidth + gap)));

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setIndex((prev) => Math.min(prev + 1, trainers.length - 1));
      return;
    }

    if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setIndex((prev) => Math.max(prev - 1, 0));
    }
  }

  function openTrainer(trainerId: string) {
    void navigate({ to: "/users/$id", params: { id: trainerId } });
  }

  if (trainers.length === 0) {
    return (
      <EmptyState
        icon={ENTITY_ICONS.trainer}
        title="No trainers yet"
        description="Trainer profiles will show up here once your studio adds them."
      />
    );
  }

  return (
    <div
      className={styles.stackRoot}
      data-compact={compact ? "true" : undefined}
    >
      <div className={styles.stackViewport} style={{ width: cardWidth + 40 }}>
        <motion.div
          className={styles.stackTrack}
          drag="x"
          dragConstraints={{
            left: -(trainers.length - 1) * (cardWidth + gap),
            right: 0,
          }}
          style={{
            x,
            gap: `${gap}px`,
            ...(reducedMotion ? {} : { perspective: 1000 }),
          }}
          animate={{
            x: -(index * (cardWidth + gap)),
          }}
          transition={reducedMotion ? { duration: 0.2 } : SPRING}
          onDragEnd={handleDragEnd}
        >
          {trainers.map((trainer, trainerIndex) => (
            <StackCard
              key={trainer.id}
              trainer={trainer}
              index={trainerIndex}
              x={x}
              cardWidth={cardWidth}
              gap={gap}
              reducedMotion={reducedMotion}
              followPending={isFollowPending?.(trainer.id)}
              selected={selectedId === trainer.id}
              selectionMode={selectionMode}
              compact={compact}
              onOpen={() => openTrainer(trainer.id)}
              onSelect={
                onSelect
                  ? () => {
                      setIndex(trainerIndex);
                      onSelect(trainer.id);
                    }
                  : undefined
              }
              onToggleFollow={
                onToggleFollow ? () => onToggleFollow(trainer) : undefined
              }
            />
          ))}
        </motion.div>
      </div>

      {trainers.length > 1 ? (
        <div className={styles.stackDots} role="tablist" aria-label="Trainers">
          {trainers.map((trainer, dotIndex) => (
            <button
              key={trainer.id}
              type="button"
              role="tab"
              aria-selected={dotIndex === index}
              aria-label={`Show ${trainer.name}`}
              className={[
                styles.stackDot,
                dotIndex === index ? styles.stackDotActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}

      <p className={styles.stackCounter}>
        {index + 1} of {trainers.length}
      </p>
    </div>
  );
}

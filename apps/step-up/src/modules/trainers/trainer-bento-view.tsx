import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import { type MotionStyle, motion, useReducedMotion } from "motion/react";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { FollowButton } from "@/modules/social/follow-button";
import { StyleList } from "@/modules/styles/style-list";
import { FollowCounts } from "./follow-counts";
import styles from "./trainers.module.scss";
import type { StudioTrainer } from "./types";

type TrainerBentoViewProps = {
  trainers: StudioTrainer[];
  isFollowPending?: ((trainerId: string) => boolean) | undefined;
  onToggleFollow?: ((trainer: StudioTrainer) => void) | undefined;
};

type ExpandDirection = "right" | "left";

type ExpansionPlan = {
  direction: ExpandDirection;
  gridColumn: string;
  gridRow: number;
  expandCol: number;
  expandRow: number;
};

type GridPlacement = {
  gridColumn: string | number;
  gridRow: number;
};

const SPRING = { type: "spring" as const, bounce: 0.2, duration: 0.6 };

const DEFAULT_TILE_SIZE_REM = 13.5;

function parseLengthPx(value: string, element: HTMLElement) {
  const trimmed = value.trim();
  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_TILE_SIZE_REM * 16;
  }
  if (trimmed.endsWith("rem")) {
    const fontSize =
      Number.parseFloat(getComputedStyle(element).fontSize) || 16;
    return numeric * fontSize;
  }
  if (trimmed.endsWith("px")) {
    return numeric;
  }
  return numeric;
}

function useGridMetrics(gridRef: RefObject<HTMLDivElement | null>) {
  const [columnsPerRow, setColumnsPerRow] = useState(3);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }

    const measure = () => {
      const width = grid.clientWidth;
      const style = getComputedStyle(grid);
      const tileSize = parseLengthPx(
        style.getPropertyValue("--bento-tile-size"),
        grid,
      );
      const gap = parseLengthPx(style.getPropertyValue("--bento-gap"), grid);
      const columns = Math.max(1, Math.floor((width + gap) / (tileSize + gap)));
      setColumnsPerRow(columns);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gridRef]);

  return columnsPerRow;
}

function getExpansionPlan(
  activeIndex: number,
  columnsPerRow: number,
  total: number,
): ExpansionPlan | null {
  if (columnsPerRow < 3) {
    return null;
  }

  const colInRow = activeIndex % columnsPerRow;
  const row = Math.floor(activeIndex / columnsPerRow);

  const tryRight = (): ExpansionPlan | null => {
    if (colInRow + 3 > columnsPerRow) {
      return null;
    }

    const indices = [activeIndex, activeIndex + 1, activeIndex + 2];
    if (indices[2]! >= total) {
      return null;
    }
    if (!indices.every((index) => Math.floor(index / columnsPerRow) === row)) {
      return null;
    }
    return {
      direction: "right",
      gridColumn: `${colInRow + 1} / span 3`,
      gridRow: row + 1,
      expandCol: colInRow,
      expandRow: row,
    };
  };

  const tryLeft = (): ExpansionPlan | null => {
    if (colInRow < 2) {
      return null;
    }

    const indices = [activeIndex - 2, activeIndex - 1, activeIndex];
    if (indices[0]! < 0) {
      return null;
    }
    if (!indices.every((index) => Math.floor(index / columnsPerRow) === row)) {
      return null;
    }
    return {
      direction: "left",
      gridColumn: `${colInRow - 1} / span 3`,
      gridRow: row + 1,
      expandCol: colInRow - 2,
      expandRow: row,
    };
  };

  const spaceRight = columnsPerRow - colInRow;
  const spaceLeft = colInRow + 1;

  if (spaceRight >= 3) {
    return tryRight() ?? tryLeft();
  }
  if (spaceLeft >= 3) {
    return tryLeft() ?? tryRight();
  }
  if (spaceRight >= spaceLeft) {
    return tryRight() ?? tryLeft();
  }
  return tryLeft() ?? tryRight();
}

function getNaturalSlot(index: number, columnsPerRow: number) {
  return {
    row: Math.floor(index / columnsPerRow),
    col: index % columnsPerRow,
  };
}

function isSlotFree(
  row: number,
  col: number,
  columnsPerRow: number,
  occupied: Set<string>,
) {
  return col >= 0 && col < columnsPerRow && !occupied.has(`${row},${col}`);
}

function occupySameRow(
  row: number,
  col: number,
  span: number,
  columnsPerRow: number,
  occupied: Set<string>,
) {
  for (let index = col; index < col + span && index < columnsPerRow; index++) {
    occupied.add(`${row},${index}`);
  }
}

function isInExpansionZone(row: number, col: number, plan: ExpansionPlan) {
  return (
    row === plan.expandRow && col >= plan.expandCol && col < plan.expandCol + 3
  );
}

function findNextSlot(
  occupied: Set<string>,
  columnsPerRow: number,
  startRow = 0,
) {
  let row = startRow;
  while (true) {
    for (let col = 0; col < columnsPerRow; col++) {
      if (isSlotFree(row, col, columnsPerRow, occupied)) {
        return { row, col };
      }
    }
    row++;
  }
}

function computeGridPlacements(
  trainers: StudioTrainer[],
  activeIndex: number,
  plan: ExpansionPlan,
  columnsPerRow: number,
): Map<string, GridPlacement> {
  const placements = new Map<string, GridPlacement>();
  const occupied = new Set<string>();
  const activeId = trainers[activeIndex]?.id;

  if (!activeId) {
    return placements;
  }

  placements.set(activeId, {
    gridColumn: plan.gridColumn,
    gridRow: plan.gridRow,
  });
  occupySameRow(plan.expandRow, plan.expandCol, 3, columnsPerRow, occupied);

  for (let index = 0; index < trainers.length; index++) {
    const trainer = trainers[index];
    if (!trainer || trainer.id === activeId) {
      continue;
    }

    const natural = getNaturalSlot(index, columnsPerRow);
    const canUseNatural =
      isSlotFree(natural.row, natural.col, columnsPerRow, occupied) &&
      !isInExpansionZone(natural.row, natural.col, plan);

    const slot = canUseNatural
      ? natural
      : findNextSlot(occupied, columnsPerRow, plan.expandRow);

    placements.set(trainer.id, {
      gridColumn: slot.col + 1,
      gridRow: slot.row + 1,
    });
    occupied.add(`${slot.row},${slot.col}`);
  }

  return placements;
}

function TrainerPhoto({ trainer }: { trainer: StudioTrainer }) {
  const imageUrl = trainer.bannerUrl ?? trainer.photoUrl;
  return (
    <div
      className={styles.bentoPhoto}
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
      data-fallback={imageUrl ? undefined : "true"}
    >
      {imageUrl ? null : (
        <span className={styles.bentoPhotoFallback} aria-hidden>
          {trainer.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function TrainerStatusBadge({ trainer }: { trainer: StudioTrainer }) {
  if (trainer.isFollowing) {
    return <Badge appearance="subtle">Following</Badge>;
  }

  if (trainer.followRequestStatus === "PENDING") {
    return <Badge appearance="subtle">Requested</Badge>;
  }

  return null;
}

type ExpandedTrainerCardProps = {
  trainer: StudioTrainer;
  direction: ExpandDirection;
  placement: GridPlacement;
  transition: { duration: number } | typeof SPRING;
  followPending?: boolean | undefined;
  onClose: () => void;
  onOpen: () => void;
  onToggleFollow?: (() => void) | undefined;
};

function ExpandedTrainerCard({
  trainer,
  direction,
  placement,
  transition,
  followPending,
  onClose,
  onOpen,
  onToggleFollow,
}: ExpandedTrainerCardProps) {
  const photo = <TrainerPhoto trainer={trainer} />;
  const body = (
    <div className={styles.bentoExpandedBody}>
      <div className={styles.bentoExpandedHeader}>
        <h2 className={styles.bentoExpandedName}>{trainer.name}</h2>
        <TrainerStatusBadge trainer={trainer} />
      </div>
      <FollowCounts
        followerCount={trainer.followerCount}
        followingCount={trainer.followingCount}
        compact
      />
      {trainer.styles.length > 0 ? (
        <StyleList
          styles={trainer.styles}
          size="xs"
          className={styles.bentoExpandedStyles}
        />
      ) : (
        <p className={styles.bentoEmpty}>No styles listed yet</p>
      )}
      <div className={styles.bentoExpandedActions}>
        {!trainer.isOwnProfile && onToggleFollow ? (
          <FollowButton
            isFollowing={trainer.isFollowing}
            followRequestStatus={trainer.followRequestStatus}
            isPending={followPending}
            onFollow={onToggleFollow}
            onUnfollow={onToggleFollow}
          />
        ) : null}
        <Button size="sm" onClick={onOpen}>
          View profile
        </Button>
      </div>
    </div>
  );

  return (
    <motion.div
      layout
      layoutId={trainer.id}
      className={styles.bentoExpanded}
      style={{
        gridColumn: placement.gridColumn,
        gridRow: placement.gridRow,
      }}
      transition={transition}
    >
      <div className={styles.bentoExpandedInner} data-direction={direction}>
        {direction === "right" ? (
          <>
            {photo}
            {body}
          </>
        ) : (
          <>
            {body}
            {photo}
          </>
        )}
      </div>
      <button
        type="button"
        className={styles.bentoCloseBtn}
        aria-label={`Close ${trainer.name} details`}
        onClick={onClose}
      >
        <Icon name="x" aria-hidden />
      </button>
    </motion.div>
  );
}

export function TrainerBentoView({
  trainers,
  isFollowPending,
  onToggleFollow,
}: TrainerBentoViewProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const columnsPerRow = useGridMetrics(gridRef);
  const [activeId, setActiveId] = useState<string | null>(null);
  const transition = reducedMotion ? { duration: 0.2 } : SPRING;

  const activeIndex = activeId
    ? trainers.findIndex((trainer) => trainer.id === activeId)
    : -1;
  const expansionPlan =
    activeIndex >= 0
      ? getExpansionPlan(activeIndex, columnsPerRow, trainers.length)
      : null;

  const gridPlacements = useMemo(() => {
    if (activeIndex < 0 || !expansionPlan) {
      return null;
    }
    return computeGridPlacements(
      trainers,
      activeIndex,
      expansionPlan,
      columnsPerRow,
    );
  }, [trainers, activeIndex, expansionPlan, columnsPerRow]);

  const gridStyle = {
    "--bento-columns": columnsPerRow,
  } as MotionStyle;

  return (
    <div className={styles.bentoRoot}>
      <motion.div
        layout
        ref={gridRef}
        className={
          gridPlacements
            ? `${styles.bentoGrid} ${styles.bentoGridExpanded}`
            : styles.bentoGrid
        }
        style={gridStyle}
      >
        {trainers.map((trainer, index) => {
          const placement = gridPlacements?.get(trainer.id);

          if (trainer.id === activeId && expansionPlan && placement) {
            return (
              <ExpandedTrainerCard
                key={trainer.id}
                trainer={trainer}
                direction={expansionPlan.direction}
                placement={placement}
                transition={transition}
                followPending={isFollowPending?.(trainer.id)}
                onClose={() => setActiveId(null)}
                onOpen={() =>
                  void navigate({
                    to: "/users/$id",
                    params: { id: trainer.id },
                  })
                }
                onToggleFollow={
                  onToggleFollow ? () => onToggleFollow(trainer) : undefined
                }
              />
            );
          }

          return (
            <motion.div
              key={trainer.id}
              layout
              layoutId={trainer.id}
              className={styles.bentoTile}
              style={
                placement
                  ? {
                      gridColumn: placement.gridColumn,
                      gridRow: placement.gridRow,
                    }
                  : {}
              }
              transition={transition}
            >
              <button
                type="button"
                className={styles.bentoTileHit}
                aria-label={`Show details for ${trainer.name}`}
                aria-expanded={false}
                onClick={() => {
                  const plan = getExpansionPlan(
                    index,
                    columnsPerRow,
                    trainers.length,
                  );
                  if (plan) {
                    setActiveId(trainer.id);
                    return;
                  }
                  void navigate({
                    to: "/users/$id",
                    params: { id: trainer.id },
                  });
                }}
              >
                <TrainerPhoto trainer={trainer} />
                <div className={styles.bentoTileOverlay}>
                  <span className={styles.bentoTileName}>{trainer.name}</span>
                </div>
                <span className={styles.bentoMoreBtn} aria-hidden>
                  <Icon name="more-horizontal" aria-hidden />
                </span>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

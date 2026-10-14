import { useNavigate } from "@tanstack/react-router";
import { StyleList } from "@/modules/styles/style-list";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import styles from "./location-trainers.module.scss";
import type { BranchLandingTrainer } from "./types";

function TrainerMedia({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={styles.mediaFill}
        loading="lazy"
        draggable={false}
      />
    );
  }
  return (
    <span className={styles.mediaFallback} aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

type LocationTrainersProps = {
  trainers: BranchLandingTrainer[];
  trainerLinkTo?: (trainerId: string) => string;
};

export function LocationTrainers({
  trainers,
  trainerLinkTo,
}: LocationTrainersProps) {
  const navigate = useNavigate();

  if (trainers.length === 0) {
    return null;
  }

  const items: ExpandableBentoItem[] = trainers.map((trainer) => ({
    id: trainer.id,
    title: trainer.name,
    ...(trainer.styles.length > 0
      ? { subtitle: trainer.styles.slice(0, 2).join(" · ") }
      : {}),
    media: <TrainerMedia name={trainer.name} photoUrl={trainer.photoUrl} />,
    ...(trainerLinkTo
      ? {
          actionLabel: "View profile",
          onAction: () => {
            void navigate({ to: trainerLinkTo(trainer.id) });
          },
        }
      : {}),
    content: (
      <div className={styles.body}>
        {trainer.bio ? (
          <div className={styles.block}>
            <p className={styles.blockLabel}>About</p>
            <p className={styles.blockValue}>{trainer.bio}</p>
          </div>
        ) : null}
        <div className={styles.block}>
          <p className={styles.blockLabel}>Styles</p>
          {trainer.styles.length > 0 ? (
            <StyleList styles={trainer.styles} size="sm" />
          ) : (
            <p className={styles.blockValue}>No styles listed yet</p>
          )}
        </div>
      </div>
    ),
  }));

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Instructors</h2>
      <ExpandableBentoGrid
        items={items}
        aria-label="Instructors at this location"
      />
    </section>
  );
}

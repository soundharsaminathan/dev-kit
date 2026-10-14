import { useNavigate } from "@tanstack/react-router";
import { FollowButton } from "@/modules/social/follow-button";
import { StyleList } from "@/modules/styles/style-list";
import { PressableCard } from "@/modules/ui/pressable-card";
import { FollowCounts } from "./follow-counts";
import { TrainerAvatar } from "./trainer-avatar";
import styles from "./trainers.module.scss";
import type { StudioTrainer } from "./types";

type TrainerCardsViewProps = {
  trainers: StudioTrainer[];
  isFollowPending?: ((trainerId: string) => boolean) | undefined;
  onToggleFollow?: ((trainer: StudioTrainer) => void) | undefined;
  selectionMode?: boolean;
  selectedId?: string | null;
  onSelect?: ((trainerId: string) => void) | undefined;
};

export function TrainerCardsView({
  trainers,
  isFollowPending,
  onToggleFollow,
  selectionMode = false,
  selectedId = null,
  onSelect,
}: TrainerCardsViewProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.cardsList}>
      {trainers.map((trainer) => {
        const selected = selectedId === trainer.id;
        return (
          <PressableCard key={trainer.id} asDiv className={styles.cardShell}>
            <div
              className={styles.cardRow}
              data-selected={selected ? "true" : undefined}
            >
              <button
                type="button"
                className={styles.cardHit}
                aria-pressed={selectionMode ? selected : undefined}
                onClick={() => {
                  if (selectionMode && onSelect) {
                    onSelect(trainer.id);
                    return;
                  }
                  void navigate({
                    to: "/users/$id",
                    params: { id: trainer.id },
                  });
                }}
              >
                <TrainerAvatar
                  name={trainer.name}
                  photoUrl={trainer.photoUrl}
                />
                <div className={styles.cardBody}>
                  <span className={styles.cardName}>{trainer.name}</span>
                  {!selectionMode ? (
                    <FollowCounts
                      followerCount={trainer.followerCount}
                      followingCount={trainer.followingCount}
                      compact
                    />
                  ) : null}
                  {trainer.styles.length > 0 ? (
                    <StyleList styles={trainer.styles} size="xs" />
                  ) : (
                    <p className={styles.cardMeta}>No styles listed yet</p>
                  )}
                </div>
              </button>
              {selectionMode ? (
                <span
                  className={styles.cardSelectHint}
                  data-selected={selected ? "true" : undefined}
                >
                  {selected ? "Selected" : "Select"}
                </span>
              ) : !trainer.isOwnProfile && onToggleFollow ? (
                <div className={styles.cardActions}>
                  <FollowButton
                    isFollowing={trainer.isFollowing}
                    followRequestStatus={trainer.followRequestStatus}
                    isPending={isFollowPending?.(trainer.id)}
                    onFollow={() => onToggleFollow(trainer)}
                    onUnfollow={() => onToggleFollow(trainer)}
                  />
                </div>
              ) : null}
            </div>
          </PressableCard>
        );
      })}
    </div>
  );
}

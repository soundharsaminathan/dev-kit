import { Badge } from "@dev-ui/components/badge";
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
};

export function TrainerCardsView({
  trainers,
  isFollowPending,
  onToggleFollow,
}: TrainerCardsViewProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.cardsList}>
      {trainers.map((trainer) => (
        <PressableCard key={trainer.id} asDiv className={styles.cardShell}>
          <button
            type="button"
            className={styles.cardHit}
            onClick={() =>
              void navigate({ to: "/users/$id", params: { id: trainer.id } })
            }
          >
            <div className={styles.cardRow}>
              <TrainerAvatar name={trainer.name} photoUrl={trainer.photoUrl} />
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{trainer.name}</span>
                  {trainer.isFollowing ? (
                    <Badge appearance="subtle">Following</Badge>
                  ) : trainer.followRequestStatus === "PENDING" ? (
                    <Badge appearance="subtle">Requested</Badge>
                  ) : null}
                </div>
                <FollowCounts
                  followerCount={trainer.followerCount}
                  followingCount={trainer.followingCount}
                  compact
                />
                {trainer.styles.length > 0 ? (
                  <StyleList styles={trainer.styles} size="xs" />
                ) : (
                  <p className={styles.cardMeta}>No styles listed yet</p>
                )}
              </div>
            </div>
          </button>
          {!trainer.isOwnProfile && onToggleFollow ? (
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
        </PressableCard>
      ))}
    </div>
  );
}

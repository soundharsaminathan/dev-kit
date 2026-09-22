import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@dev-ui/components/toast";
import { AppSheet } from "@/modules/ui/app-sheet";
import { useApi } from "@/lib/api-context";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import { TouchButton } from "@/modules/ui/touch-button";
import { weekdayLabel } from "@/modules/marketplace/controls";
import styles from "./hire-trainer-sheet.module.scss";

export type HireableTrainer = {
  id: string;
  name: string;
  photoUrl: string | null;
  availability: Array<{ weekday: number; startsAt: string; endsAt: string }>;
  nextWindows: Array<{ startsAt: string; endsAt: string }>;
};

type HireTrainerSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  from: Date;
  to: Date;
  focusTrainerId?: string | null;
};

export function HireTrainerSheet({
  isOpen,
  onOpenChange,
  studioId,
  from,
  to,
  focusTrainerId,
}: HireTrainerSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("HireTrainerSheet");

  const query = useQuery({
    queryKey: [
      "hireable-trainers",
      studioId,
      from.toISOString(),
      to.toISOString(),
    ],
    enabled: isOpen && Boolean(studioId),
    queryFn: () =>
      api.get<HireableTrainer[]>(
        `/studios/${studioId}/hireable-trainers?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      ),
  });

  const attach = useMutation({
    mutationFn: (trainerId: string) =>
      api.post(`/studios/${studioId}/trainer-links`, { trainerId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hireable-trainers"] }),
        queryClient.invalidateQueries({ queryKey: ["calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["studio-trainers"] }),
      ]);
      toast({
        title: "Trainer attached",
        description: "They now teach at this studio.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t attach trainer",
        description:
          error instanceof Error ? error.message : "Could not attach trainer.",
        variant: "error",
      });
    },
  });

  const trainers = query.data ?? [];
  const focused = focusTrainerId
    ? trainers.filter((trainer) => trainer.id === focusTrainerId)
    : trainers;
  const list = focused.length > 0 ? focused : trainers;

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Hire trainer"
      size="tall"
    >
      <div className={styles.sheet}>
        <p className={styles.lead}>
          Attach a freelance trainer from their published availability. This
          creates a studio link — it is not a student booking.
        </p>
        {query.isLoading ? (
          <SkeletonRowList count={4} label="Loading available trainers" />
        ) : null}
        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load hireable trainers."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}
        {!query.isLoading && !query.isError && list.length === 0 ? (
          <EmptyState
            title="No freelance trainers"
            description="Trainers appear here after they publish availability and are not already attached."
          />
        ) : null}
        <ul className={styles.list}>
          {list.map((trainer) => (
            <li key={trainer.id} className={styles.card}>
              {trainer.photoUrl ? (
                <img
                  className={styles.photo}
                  src={trainer.photoUrl}
                  alt=""
                />
              ) : (
                <div className={styles.photoFallback} aria-hidden />
              )}
              <div className={styles.copy}>
                <p className={styles.name}>{trainer.name}</p>
                <p className={styles.hours}>
                  {trainer.availability
                    .map(
                      (slot) =>
                        `${weekdayLabel(slot.weekday)} ${slot.startsAt}–${slot.endsAt}`,
                    )
                    .join(" · ") || "Availability on calendar"}
                </p>
              </div>
              <TouchButton
                size="sm"
                variant="primary"
                data-testid={`hire-trainer-${trainer.id}`}
                isPending={
                  attach.isPending && attach.variables === trainer.id
                }
                onClick={() => attach.mutate(trainer.id)}
              >
                Attach
              </TouchButton>
            </li>
          ))}
        </ul>
      </div>
    </AppSheet>
  );
}

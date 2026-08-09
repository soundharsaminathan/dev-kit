import { Button } from "@dev-ui/components/button";
import { Checkbox } from "@dev-ui/components/checkbox";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { useStudioId } from "@/lib/use-studio-id";
import { StyleList } from "@/modules/styles/style-list";
import { FollowCounts } from "@/modules/trainers/follow-counts";
import type { StudioTrainer } from "@/modules/trainers/types";
import { useStudioTrainers } from "@/modules/trainers/use-trainers";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import {
  ExpandableBentoGrid,
  type ExpandableBentoItem,
} from "@/modules/ui/expandable-bento-grid";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import styles from "./batch-trainers.module.scss";

const MAX_TRAINERS = 5;

export type BatchTrainerRef = {
  trainerId: string;
  trainer: {
    id: string;
    name: string;
    email: string;
    photoUrl?: string | null;
  };
};

type BatchTrainersProps = {
  batchId: string;
  trainers: BatchTrainerRef[];
};

function trainerSubtitle(trainer: StudioTrainer | undefined, email: string) {
  if (trainer?.styles.length) {
    return trainer.styles.slice(0, 2).join(" · ");
  }
  return email;
}

function TrainerMedia({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
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

export function BatchTrainers({ batchId, trainers }: BatchTrainersProps) {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchTrainers");
  const studioTrainers = useStudioTrainers();
  const [manageOpen, setManageOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);

  const assignedIds = useMemo(
    () => trainers.map((row) => row.trainerId),
    [trainers],
  );

  const trainerById = useMemo(() => {
    const map = new Map<string, StudioTrainer>();
    for (const trainer of studioTrainers.data ?? []) {
      map.set(trainer.id, trainer);
    }
    return map;
  }, [studioTrainers.data]);

  const assigned = useMemo(() => {
    return trainers.slice(0, MAX_TRAINERS).map((row) => {
      const enriched = trainerById.get(row.trainer.id);
      return {
        ...row,
        enriched,
      };
    });
  }, [trainers, trainerById]);

  const saveTrainers = useMutation({
    mutationFn: (trainerIds: string[]) =>
      api.patch(`/batches/${batchId}`, { trainerIds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({ queryKey: ["batches", studioId] }),
      ]);
      toast({
        title: "Instructors saved",
        description: "Batch instructors updated.",
        variant: "success",
      });
      setManageOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save instructors",
        description:
          error instanceof Error
            ? error.message
            : "Could not update instructors.",
        variant: "error",
      });
    },
  });

  function openManage() {
    setDraftIds(assignedIds);
    setManageOpen(true);
  }

  function toggleTrainer(id: string, selected: boolean) {
    setDraftIds((current) => {
      if (selected) {
        if (current.includes(id) || current.length >= MAX_TRAINERS) {
          return current;
        }
        return [...current, id];
      }
      return current.filter((value) => value !== id);
    });
  }

  const items: ExpandableBentoItem[] = assigned.map((row) => {
    const profile = row.enriched;
    const photoUrl = profile?.photoUrl ?? row.trainer.photoUrl ?? null;
    const subtitle = trainerSubtitle(profile, row.trainer.email);

    return {
      id: row.trainer.id,
      title: row.trainer.name,
      subtitle,
      description: row.trainer.email,
      media: <TrainerMedia name={row.trainer.name} photoUrl={photoUrl} />,
      actionLabel: "View profile",
      onAction: () => {
        void navigate({
          to: "/users/$id",
          params: { id: row.trainer.id },
        });
      },
      content: (
        <div className={styles.profileBody}>
          {profile ? (
            <div className={styles.profileBlock}>
              <p className={styles.profileLabel}>Audience</p>
              <FollowCounts
                followerCount={profile.followerCount}
                followingCount={profile.followingCount}
              />
            </div>
          ) : null}
          <div className={styles.profileBlock}>
            <p className={styles.profileLabel}>Contact</p>
            <p className={styles.profileValue}>{row.trainer.email}</p>
          </div>
          <div className={styles.profileBlock}>
            <p className={styles.profileLabel}>Styles</p>
            {profile && profile.styles.length > 0 ? (
              <StyleList styles={profile.styles} size="sm" />
            ) : (
              <p className={styles.profileValue}>No styles listed yet</p>
            )}
          </div>
          <p className={styles.sheetHint}>
            Assigned to teach this batch. Open their profile for posts,
            followers, and full bio.
          </p>
        </div>
      ),
    };
  });

  const countLabel =
    assigned.length === 1 ? "1 instructor" : `${assigned.length} instructors`;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Instructors</p>
          <h2 className={styles.heading}>Who teaches this batch</h2>
          <p className={styles.summary}>
            {assigned.length > 0
              ? `${countLabel} · tap a card for their profile`
              : `Assign up to ${MAX_TRAINERS} instructors for this class`}
          </p>
        </div>
        <Button variant="quiet" size="sm" onClick={openManage}>
          {assigned.length > 0 ? "Manage" : "Assign"}
        </Button>
      </div>

      {studioTrainers.isError ? (
        <ErrorState
          description={
            studioTrainers.error instanceof Error
              ? studioTrainers.error.message
              : "Could not load trainer profiles."
          }
          action={
            <Button variant="primary" onClick={() => studioTrainers.refetch()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {!studioTrainers.isError && assigned.length === 0 ? (
        <EmptyState
          icon={ENTITY_ICONS.trainer}
          title="No instructors yet"
          description="Assign trainers so students know who leads this class."
          action={
            <Button variant="primary" onClick={openManage}>
              Assign trainers
            </Button>
          }
        />
      ) : null}

      {assigned.length > 0 ? (
        <ExpandableBentoGrid items={items} aria-label="Batch instructors" />
      ) : null}

      <AppBottomSheet
        isOpen={manageOpen}
        onOpenChange={setManageOpen}
        title="Assign instructors"
      >
        <p className={styles.sheetHint}>
          Choose up to {MAX_TRAINERS} trainers for this batch. Students see
          these on the class card and detail pages.
        </p>

        {studioTrainers.isLoading ? (
          <p className={styles.sheetHint}>Loading studio trainers…</p>
        ) : null}

        {studioTrainers.isFetched &&
        (studioTrainers.data?.length ?? 0) === 0 ? (
          <p className={styles.sheetHint}>
            Add a trainer to this studio before assigning one here.
          </p>
        ) : null}

        <div className={styles.sheetList}>
          {(studioTrainers.data ?? []).map((trainer) => {
            const selected = draftIds.includes(trainer.id);
            const atCap = !selected && draftIds.length >= MAX_TRAINERS;
            return (
              <div key={trainer.id} className={styles.sheetRow}>
                <Checkbox
                  isSelected={selected}
                  isDisabled={atCap}
                  onChange={(value) => toggleTrainer(trainer.id, value)}
                >
                  {trainer.name}
                </Checkbox>
                <div className={styles.sheetMeta}>
                  <span>{trainer.email}</span>
                  {trainer.styles.length > 0 ? (
                    <span>{trainer.styles.slice(0, 2).join(" · ")}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {draftIds.length === 0 ? (
          <p className={styles.sheetError}>Select at least one instructor.</p>
        ) : (
          <p className={styles.sheetHint}>
            {draftIds.length} of {MAX_TRAINERS} selected
          </p>
        )}

        {saveTrainers.isError ? (
          <p className={styles.sheetError}>
            {saveTrainers.error instanceof Error
              ? saveTrainers.error.message
              : "Could not update instructors."}
          </p>
        ) : null}

        <div className={styles.sheetActions}>
          <Button variant="quiet" onClick={() => setManageOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isDisabled={draftIds.length === 0}
            isPending={saveTrainers.isPending}
            onClick={() => saveTrainers.mutate(draftIds)}
          >
            Save instructors
          </Button>
        </div>
      </AppBottomSheet>
    </div>
  );
}

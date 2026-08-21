import { Avatar, AvatarFallback } from "@dev-ui/components/avatar";
import { useToastContext } from "@dev-ui/components/toast";
import {
  captureQuerySnapshot,
  restoreQuerySnapshot,
  useOptimisticMutation,
} from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  formatRelativeFollowup,
  LEAD_REMARK_MAX_LENGTH,
  type Lead,
  type LeadRemark,
} from "./types";

function remarkInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type LeadDetailSheetProps = {
  lead: Lead | null;
  studioId: string;
  onOpenChange: (open: boolean) => void;
  onArchive: (lead: Lead) => void;
  onUnarchive: (lead: Lead) => void;
  archivePending?: boolean | undefined;
};

export function LeadDetailSheet({
  lead,
  studioId,
  onOpenChange,
  onArchive,
  onUnarchive,
  archivePending = false,
}: LeadDetailSheetProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToastContext("LeadDetailSheet");
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const isOpen = Boolean(lead);
  const archived = lead?.section === "archived" || lead?.active === false;

  const remarksQuery = useQuery({
    queryKey: ["lead-remarks", studioId, lead?.id],
    queryFn: () =>
      api.get<LeadRemark[]>(
        `/users/studio/${studioId}/leads/${lead?.id}/remarks`,
      ),
    enabled: Boolean(lead),
  });

  const addRemark = useOptimisticMutation({
    mutationFn: (body: string) =>
      api.post<LeadRemark>(
        `/users/studio/${studioId}/leads/${lead?.id}/remarks`,
        { body },
      ),
    onOptimistic: (body) => {
      const queryKey = ["lead-remarks", studioId, lead?.id];
      return captureQuerySnapshot<LeadRemark[]>(queryClient, queryKey).then(
        (snapshot) => {
          queryClient.setQueryData<LeadRemark[]>(queryKey, (current) => [
            ...(current ?? []),
            {
              id: `optimistic-${Date.now()}`,
              body,
              createdAt: new Date().toISOString(),
              author: {
                id: user?.id ?? "",
                name: user?.name ?? "You",
              },
            },
          ]);
          return snapshot;
        },
      );
    },
    onRollback: (snapshot) => restoreQuerySnapshot(queryClient, snapshot),
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t add remark",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["lead-remarks", studioId, lead?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
  });

  const remarkCount = remarksQuery.data?.length ?? 0;

  useEffect(() => {
    const list = listRef.current;
    if (!list || remarkCount === 0) return;
    list.scrollTop = list.scrollHeight;
  }, [remarkCount]);

  function submitRemark() {
    const body = draft.trim();
    if (!body || addRemark.isPending) return;
    setDraft("");
    addRemark.mutate(body);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRemark();
    }
  }

  const canSend =
    Boolean(draft.trim()) &&
    draft.trim().length <= LEAD_REMARK_MAX_LENGTH &&
    !addRemark.isPending;

  return (
    <AppBottomSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Comments"
      sizing="dynamic"
    >
      {lead ? (
        <div className={styles.sheetStack}>
          <div className={styles.sheetHeader}>
            <p className={styles.sheetLead}>{lead.name}</p>
            <TouchButton
              variant={archived ? "primary" : "quiet"}
              size="sm"
              isIconOnly
              className={styles.sheetArchive}
              aria-label={
                archived ? `Unarchive ${lead.name}` : `Archive ${lead.name}`
              }
              data-testid={
                archived
                  ? `lead-unarchive-${lead.id}`
                  : `lead-archive-${lead.id}`
              }
              isDisabled={archivePending}
              onClick={() => {
                if (archived) onUnarchive(lead);
                else onArchive(lead);
              }}
            >
              <Icon name={archived ? "inbox" : "archive"} />
            </TouchButton>
          </div>

          <div className={styles.remarks} ref={listRef}>
            {remarksQuery.isLoading ? (
              <p className={styles.remarksEmpty}>Loading comments…</p>
            ) : remarksQuery.isError ? (
              <ErrorState
                description={
                  remarksQuery.error instanceof Error
                    ? remarksQuery.error.message
                    : "Couldn’t load comments."
                }
              />
            ) : !remarksQuery.data?.length ? (
              <p className={styles.remarksEmpty}>
                No comments yet — add one after you call.
              </p>
            ) : (
              remarksQuery.data.map((remark) => (
                <div
                  key={remark.id}
                  className={styles.remark}
                  data-testid={`lead-remark-${remark.id}`}
                >
                  <Avatar className={styles.remarkAvatar}>
                    <AvatarFallback>
                      {remarkInitials(remark.author.name) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={styles.remarkContent}>
                    <p className={styles.remarkText}>
                      <span className={styles.remarkAuthor}>
                        {remark.author.name}
                      </span>{" "}
                      <span className={styles.remarkBody}>{remark.body}</span>
                    </p>
                    <span className={styles.remarkWhen}>
                      {formatRelativeFollowup(remark.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.composer}>
            <FormInput
              label="Add a comment"
              placeholder="Add a comment…"
              value={draft}
              onChange={setDraft}
              maxLength={LEAD_REMARK_MAX_LENGTH}
              data-testid="lead-remark-input"
              onKeyDown={handleComposerKeyDown}
            />
            <TouchButton
              variant="outline"
              size="sm"
              isIconOnly
              isPending={addRemark.isPending}
              isDisabled={!canSend}
              data-testid="lead-remark-send"
              onClick={submitRemark}
              aria-label="Send"
            >
              <Icon name="send" />
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppBottomSheet>
  );
}

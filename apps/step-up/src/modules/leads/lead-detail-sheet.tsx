import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type KeyboardEvent, useState } from "react";
import { useApi } from "@/lib/api-context";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  formatFollowupChip,
  formatRelativeFollowup,
  LEAD_REMARK_MAX_LENGTH,
  type Lead,
  type LeadRemark,
  phoneTelHref,
  SECTION_LABELS,
} from "./types";

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
  const { toast } = useToastContext("LeadDetailSheet");
  const [draft, setDraft] = useState("");
  const isOpen = Boolean(lead);
  const telHref = lead?.phone ? phoneTelHref(lead.phone) : null;
  const archived = lead?.section === "archived" || lead?.active === false;

  const remarksQuery = useQuery({
    queryKey: ["lead-remarks", studioId, lead?.id],
    queryFn: () =>
      api.get<LeadRemark[]>(
        `/users/studio/${studioId}/leads/${lead?.id}/remarks`,
      ),
    enabled: Boolean(lead),
  });

  const addRemark = useMutation({
    mutationFn: (body: string) =>
      api.post<LeadRemark>(
        `/users/studio/${studioId}/leads/${lead?.id}/remarks`,
        { body },
      ),
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: ["lead-remarks", studioId, lead?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t add remark",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
        variant: "error",
      });
    },
  });

  function submitRemark() {
    const body = draft.trim();
    if (!body || addRemark.isPending) return;
    addRemark.mutate(body);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitRemark();
    }
  }

  function handleCall() {
    if (!telHref) return;
    window.location.assign(telHref);
  }

  const canSend =
    Boolean(draft.trim()) &&
    draft.trim().length <= LEAD_REMARK_MAX_LENGTH &&
    !addRemark.isPending;

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={lead?.name ?? "Lead"}
      size="tall"
    >
      {lead ? (
        <div className={styles.sheetStack}>
          <div className={styles.sheetHeader}>
            <div className={styles.sheetMeta}>
              <p className={styles.sheetPhone}>
                {lead.phone ? lead.phone : "No mobile on file"}
              </p>
              <span
                className={styles.followupChip}
                data-empty={!lead.lastFollowupAt ? "true" : undefined}
              >
                {formatFollowupChip(lead.lastFollowupAt)}
              </span>
              <span
                className={styles.sectionChip}
                data-testid="lead-section-chip"
              >
                {SECTION_LABELS[lead.section]}
              </span>
            </div>
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

          <div className={styles.remarks}>
            {remarksQuery.isLoading ? (
              <p className={styles.remarksEmpty}>Loading remarks…</p>
            ) : remarksQuery.isError ? (
              <ErrorState
                description={
                  remarksQuery.error instanceof Error
                    ? remarksQuery.error.message
                    : "Couldn’t load remarks."
                }
              />
            ) : !remarksQuery.data?.length ? (
              <p className={styles.remarksEmpty}>
                No remarks yet — add one after you call.
              </p>
            ) : (
              remarksQuery.data.map((remark) => (
                <div
                  key={remark.id}
                  className={styles.remark}
                  data-testid={`lead-remark-${remark.id}`}
                >
                  <div className={styles.remarkMeta}>
                    <span className={styles.remarkAuthor}>
                      {remark.author.name}
                    </span>
                    <span className={styles.remarkWhen}>
                      {formatRelativeFollowup(remark.createdAt)}
                    </span>
                  </div>
                  <p className={styles.remarkBody}>{remark.body}</p>
                </div>
              ))
            )}
          </div>

          <div className={styles.composer}>
            <FormInput
              label="Add a remark"
              value={draft}
              onChange={setDraft}
              maxLength={LEAD_REMARK_MAX_LENGTH}
              data-testid="lead-remark-input"
              onKeyDown={handleComposerKeyDown}
            />
            <TouchButton
              variant="outline"
              fullWidth
              isPending={addRemark.isPending}
              isDisabled={!canSend}
              data-testid="lead-remark-send"
              onClick={submitRemark}
            >
              Send
            </TouchButton>
          </div>

          <TouchButton
            variant="primary"
            fullWidth
            className={styles.callButton}
            aria-label={telHref ? `Call ${lead.name}` : "No phone number"}
            data-testid={`lead-call-${lead.id}`}
            isDisabled={!telHref}
            onClick={handleCall}
          >
            <Icon name="phone-call" />
            Call
          </TouchButton>
        </div>
      ) : null}
    </AppSheet>
  );
}

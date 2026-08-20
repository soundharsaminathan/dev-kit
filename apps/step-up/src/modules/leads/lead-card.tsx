import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { CheckboxControl } from "@dev-ui/components/checkbox";
import { Icon } from "@dev-ui/icons";
import type { KeyboardEvent } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  ageRangeLabel,
  canConfirmTrialSession,
  formatFollowupChip,
  formatTrialWhen,
  isTrialSoon,
  isTrialToday,
  type Lead,
  type LeadDateRange,
  phoneTelHref,
} from "./types";

type LeadCardProps = {
  lead: Lead;
  range: LeadDateRange | null;
  onOpen?: ((lead: Lead) => void) | undefined;
  onOpenRemarks?: ((lead: Lead) => void) | undefined;
  onSwitchTrial?: ((lead: Lead) => void) | undefined;
  onConfirmSession?: ((lead: Lead) => void) | undefined;
  confirmPending?: boolean | undefined;
  selected?: boolean | undefined;
  onToggleSelect?: ((lead: Lead) => void) | undefined;
};

export function LeadCard({
  lead,
  range,
  onOpen,
  onOpenRemarks,
  onSwitchTrial,
  onConfirmSession,
  confirmPending = false,
  selected = false,
  onToggleSelect,
}: LeadCardProps) {
  const age = ageRangeLabel(lead.ageRange);
  const trial = lead.trialBooking;
  const soon = isTrialSoon(trial?.sessionStartsAt ?? null, range);
  const initials = lead.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const followupLabel = formatFollowupChip(lead.lastFollowupAt);
  const callHref = lead.phone ? phoneTelHref(lead.phone) : null;
  const clickable = Boolean(onOpen);

  function handleOpen() {
    onOpen?.(lead);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  }

  return (
    <div
      className={styles.card}
      data-testid={`lead-card-${lead.id}`}
      data-soon={soon ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-clickable={clickable ? "true" : undefined}
    >
      <div className={styles.topRow}>
        {onToggleSelect ? (
          <CheckboxControl
            aria-label={`Select ${lead.name}`}
            isSelected={selected}
            onChange={() => onToggleSelect(lead)}
            className={styles.cardSelect}
          />
        ) : null}
        <div
          className={styles.identity}
          data-testid={`lead-open-${lead.id}`}
          {...(clickable
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: handleOpen,
                onKeyDown: handleKeyDown,
                "aria-label": `Open ${lead.name}`,
              }
            : {})}
        >
          <Avatar className={styles.avatar}>
            {lead.photoUrl ? <AvatarImage src={lead.photoUrl} alt="" /> : null}
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className={styles.body}>
            <div className={styles.nameRow}>
              <p className={styles.name}>{lead.name}</p>
              {age ? <span className={styles.age}>{age}</span> : null}
              {callHref ? (
                <TouchButton
                  as="a"
                  href={callHref}
                  variant="primary"
                  size="sm"
                  isIconOnly
                  className={styles.callAction}
                  aria-label={`Call ${lead.name}`}
                  data-testid={`lead-call-${lead.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Icon name="phone-call" />
                </TouchButton>
              ) : null}
            </div>

            <span
              className={styles.followupChip}
              data-empty={!lead.lastFollowupAt ? "true" : undefined}
              data-testid={`lead-followup-${lead.id}`}
            >
              {followupLabel}
            </span>
          </div>
        </div>
        {onOpenRemarks ? (
          <TouchButton
            variant="quiet"
            size="sm"
            isIconOnly
            className={styles.commentAction}
            aria-label={`Comments for ${lead.name}`}
            data-testid={`lead-remarks-${lead.id}`}
            onClick={() => onOpenRemarks(lead)}
          >
            <Icon name="message-square" />
          </TouchButton>
        ) : null}
      </div>

      {trial ? (
        <div className={styles.trialBlock}>
          <div
            className={styles.trialInfo}
            {...(clickable
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: handleOpen,
                  onKeyDown: handleKeyDown,
                }
              : {})}
          >
            {trial.status === "CONFIRMED" ? (
              <span
                className={styles.badge}
                data-tone="success"
                data-testid={`lead-confirmed-${lead.id}`}
              >
                Booking confirmed
              </span>
            ) : soon ? (
              <span className={styles.badge}>Call soon</span>
            ) : null}
            <p
              className={styles.trialWhen}
              data-testid={`lead-trial-when-${lead.id}`}
            >
              {trial.sessionStartsAt
                ? isTrialToday(trial.sessionStartsAt)
                  ? "Today"
                  : formatTrialWhen(trial.sessionStartsAt)
                : "Time to confirm"}
            </p>
            {trial.batchName ? (
              <p className={styles.trialBatch}>{trial.batchName}</p>
            ) : null}
          </div>
          {onSwitchTrial || onConfirmSession ? (
            <div className={styles.trialActions}>
              {onConfirmSession && canConfirmTrialSession(trial) ? (
                <TouchButton
                  size="sm"
                  variant="primary"
                  isPending={confirmPending}
                  isDisabled={confirmPending}
                  data-testid={`lead-confirm-session-${lead.id}`}
                  onClick={() => onConfirmSession(lead)}
                >
                  Confirm
                </TouchButton>
              ) : null}
              {onSwitchTrial ? (
                <TouchButton
                  size="sm"
                  variant="outline"
                  data-testid={`lead-switch-trial-${lead.id}`}
                  onClick={() => onSwitchTrial(lead)}
                >
                  {trial.sessionId ? "Switch" : "Pick session"}
                </TouchButton>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.trialBlock}>
          <div
            className={styles.trialInfo}
            {...(clickable
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: handleOpen,
                  onKeyDown: handleKeyDown,
                }
              : {})}
          >
            <p className={styles.trialLabel}>No trial yet</p>
            <p className={styles.trialBatch}>Call to pick a session</p>
          </div>
          {onSwitchTrial ? (
            <div className={styles.trialActions}>
              <TouchButton
                size="sm"
                variant="outline"
                data-testid={`lead-pick-session-${lead.id}`}
                onClick={() => onSwitchTrial(lead)}
              >
                Pick session
              </TouchButton>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

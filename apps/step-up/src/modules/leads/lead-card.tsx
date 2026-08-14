import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { CheckboxControl } from "@dev-ui/components/checkbox";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  ageRangeLabel,
  canConfirmTrialSession,
  formatTrialWhen,
  isTrialSoon,
  type Lead,
  type LeadDateRange,
  phoneTelHref,
} from "./types";

type LeadCardProps = {
  lead: Lead;
  range: LeadDateRange | null;
  onViewProfile?: (() => void) | undefined;
  onSwitchTrial?: ((lead: Lead) => void) | undefined;
  onConfirmSession?: ((lead: Lead) => void) | undefined;
  confirmPending?: boolean | undefined;
  selected?: boolean | undefined;
  onToggleSelect?: ((lead: Lead) => void) | undefined;
};

export function LeadCard({
  lead,
  range,
  onViewProfile,
  onSwitchTrial,
  onConfirmSession,
  confirmPending = false,
  selected = false,
  onToggleSelect,
}: LeadCardProps) {
  const { toast } = useToastContext("LeadCard");
  const telHref = lead.phone ? phoneTelHref(lead.phone) : null;
  const age = ageRangeLabel(lead.ageRange);
  const trial = lead.trialBooking;
  const soon = isTrialSoon(trial?.sessionStartsAt ?? null, range);
  const initials = lead.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      toast({
        title: "Mobile number copied",
        variant: "success",
      });
    } catch {
      toast({
        title: "Couldn’t copy mobile number",
        variant: "error",
      });
    }
  }

  return (
    <div
      className={styles.card}
      data-soon={soon ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
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
        {onViewProfile ? (
          <button
            type="button"
            className={styles.profileHit}
            aria-label={`View ${lead.name}'s profile`}
            data-testid={`lead-profile-${lead.id}`}
            onClick={onViewProfile}
          >
            <Avatar className={styles.avatar}>
              {lead.photoUrl ? (
                <AvatarImage src={lead.photoUrl} alt="" />
              ) : null}
              <AvatarFallback>{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className={styles.body}>
              <div className={styles.nameRow}>
                <p className={styles.name}>{lead.name}</p>
                {age ? <span className={styles.age}>{age}</span> : null}
              </div>
              <p className={styles.meta}>
                {lead.phone ? lead.phone : "No mobile on file"}
              </p>
            </div>
          </button>
        ) : (
          <>
            <Avatar className={styles.avatar}>
              {lead.photoUrl ? (
                <AvatarImage src={lead.photoUrl} alt="" />
              ) : null}
              <AvatarFallback>{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className={styles.body}>
              <div className={styles.nameRow}>
                <p className={styles.name}>{lead.name}</p>
                {age ? <span className={styles.age}>{age}</span> : null}
              </div>
              {lead.phone ? (
                <button
                  type="button"
                  className={styles.phone}
                  aria-label={`Copy ${lead.phone}`}
                  data-testid={`lead-copy-phone-${lead.id}`}
                  onClick={() => {
                    if (!lead.phone) return;
                    void copyPhone(lead.phone);
                  }}
                >
                  {lead.phone}
                </button>
              ) : (
                <p className={styles.meta}>No mobile on file</p>
              )}
            </div>
          </>
        )}
        <TouchButton
          variant="primary"
          size="sm"
          isIconOnly
          className={styles.callButton}
          aria-label={telHref ? `Call ${lead.name}` : "No phone number"}
          data-testid={`lead-call-${lead.id}`}
          isDisabled={!telHref}
          onClick={() => {
            if (!telHref) return;
            window.location.assign(telHref);
          }}
        >
          <Icon name="phone-call" />
        </TouchButton>
      </div>

      {trial ? (
        <div className={styles.trialBlock}>
          <div className={styles.trialInfo}>
            {trial.status === "CONFIRMED" ? (
              <span
                className={styles.badge}
                data-tone="success"
                data-testid={`lead-confirmed-${lead.id}`}
              >
                Confirmed
              </span>
            ) : soon ? (
              <span className={styles.badge}>Call soon</span>
            ) : null}
            <p className={styles.trialWhen}>
              {trial.sessionStartsAt
                ? formatTrialWhen(trial.sessionStartsAt)
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
                  Confirm session
                </TouchButton>
              ) : null}
              {onSwitchTrial ? (
                <TouchButton
                  size="sm"
                  variant="outline"
                  data-testid={`lead-switch-trial-${lead.id}`}
                  onClick={() => onSwitchTrial(lead)}
                >
                  {trial.sessionId ? "Switch session" : "Pick session"}
                </TouchButton>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.trialBlock}>
          <div className={styles.trialInfo}>
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

import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Icon } from "@dev-ui/icons";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./leads.module.scss";
import {
  ageRangeLabel,
  formatTrialWhen,
  isTrialSoon,
  type Lead,
  type LeadDateFilter,
  phoneTelHref,
} from "./types";

type LeadCardProps = {
  lead: Lead;
  filter: LeadDateFilter;
  onSwitchTrial?: ((lead: Lead) => void) | undefined;
};

export function LeadCard({ lead, filter, onSwitchTrial }: LeadCardProps) {
  const telHref = lead.phone ? phoneTelHref(lead.phone) : null;
  const age = ageRangeLabel(lead.ageRange);
  const trial = lead.trialBooking;
  const soon = isTrialSoon(trial?.sessionStartsAt ?? null, filter);
  const initials = lead.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const metaParts = [age, lead.phone].filter(Boolean);

  return (
    <div className={styles.card} data-soon={soon ? "true" : undefined}>
      <div className={styles.topRow}>
        <Avatar className={styles.avatar}>
          {lead.photoUrl ? <AvatarImage src={lead.photoUrl} alt="" /> : null}
          <AvatarFallback>{initials || "?"}</AvatarFallback>
        </Avatar>
        <div className={styles.body}>
          <p className={styles.name}>{lead.name}</p>
          {metaParts.length > 0 ? (
            <p className={styles.meta}>{metaParts.join(" · ")}</p>
          ) : (
            <p className={styles.meta}>No mobile on file</p>
          )}
        </div>
        {telHref ? (
          <a
            className={styles.callButton}
            href={telHref}
            aria-label={`Call ${lead.name}`}
            data-testid={`lead-call-${lead.id}`}
          >
            <Icon name="smartphone" />
          </a>
        ) : (
          <span
            className={styles.callButton}
            data-disabled="true"
            title="No phone number"
          >
            <Icon name="smartphone" />
          </span>
        )}
      </div>

      {trial ? (
        <div className={styles.trialBlock}>
          {soon ? <span className={styles.badge}>Call soon</span> : null}
          <p className={styles.trialLabel}>Trial session</p>
          <p className={styles.trialWhen}>
            {trial.sessionStartsAt
              ? formatTrialWhen(trial.sessionStartsAt)
              : "Time to confirm"}
          </p>
          {trial.batchName ? (
            <p className={styles.trialBatch}>{trial.batchName}</p>
          ) : null}
          {onSwitchTrial ? (
            <TouchButton
              size="sm"
              variant="quiet"
              data-testid={`lead-switch-trial-${lead.id}`}
              onClick={() => onSwitchTrial(lead)}
            >
              {trial.sessionId ? "Switch session" : "Pick session"}
            </TouchButton>
          ) : null}
        </div>
      ) : (
        <div className={styles.trialBlock}>
          <p className={styles.trialLabel}>No trial yet</p>
          <p className={styles.trialBatch}>Call to pick a session</p>
        </div>
      )}
    </div>
  );
}

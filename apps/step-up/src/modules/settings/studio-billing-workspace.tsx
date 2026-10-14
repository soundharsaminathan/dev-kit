import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxPopover,
} from "@dev-ui/components/combobox";
import { InputGroup, InputGroupAddon } from "@dev-ui/components/input-group";
import { NumberField } from "@dev-ui/components/number-field";
import { Icon, type IconName } from "@dev-ui/icons";
import { useEffect, useMemo, useState } from "react";
import {
  type BillingFieldErrors,
  type BillingValues,
  EXPIRE_ALERT_DAYS_MAX,
  EXPIRE_ALERT_DAYS_MIN,
  expiryReminderLabel,
  formatAdmissionFee,
  GRACE_DAYS_MAX,
  GRACE_DAYS_MIN,
  gracePeriodLabel,
  isAdmissionEnabled,
  listStudioTimezones,
  parseAmount,
  parseBoundedInteger,
  timezoneConfirmation,
} from "./studio-billing-model";
import styles from "./studio-billing-workspace.module.scss";
import { SettingsSaveBar, UnsavedChangesDialog } from "./ui";

const BILLING_STEPS = [
  "Student enrolls",
  "Membership invoice is created",
  "Payment becomes due",
  "Grace period begins",
  "Expiry reminders are sent",
] as const;

type StudioBillingWorkspaceProps = {
  values: BillingValues;
  setField: <K extends keyof BillingValues>(
    key: K,
    value: BillingValues[K],
  ) => void;
  platformFeePercent: number;
  isOwner: boolean;
  isDirty: boolean;
  isPending: boolean;
  showErrors?: boolean;
  errors?: BillingFieldErrors;
  saveError?: string | null;
  onSave: () => void;
  onDiscard: () => void;
  leaveOpen?: boolean;
  onStay?: () => void;
  onLeaveWithoutSaving?: () => void;
};

function toNumberValue(raw: string): number {
  if (raw.trim() === "") return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function DayStepper({
  label,
  value,
  min,
  max,
  onChange,
  isInvalid,
  readOnly,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (next: string) => void;
  isInvalid?: boolean;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <p className={styles.readout}>{value || "—"}</p>;
  }

  return (
    <div className={styles.stepper}>
      <NumberField
        aria-label={label}
        value={toNumberValue(value)}
        minValue={min}
        maxValue={max}
        step={1}
        {...(isInvalid ? { isInvalid: true } : {})}
        onChange={(next) => {
          if (Number.isNaN(next)) {
            onChange("");
            return;
          }
          onChange(String(Math.min(max, Math.max(min, Math.round(next)))));
        }}
      />
    </div>
  );
}

function TimezoneField({
  value,
  onChange,
  isInvalid,
  readOnly,
}: {
  value: string;
  onChange: (next: string) => void;
  isInvalid?: boolean;
  readOnly?: boolean;
}) {
  const options = useMemo(() => listStudioTimezones(), []);
  const items = useMemo(
    () =>
      options.map((zone) => ({
        id: zone.id,
        label: zone.label,
        textValue: zone.textValue,
      })),
    [options],
  );
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  if (readOnly) {
    return <p className={styles.readout}>{value || "—"}</p>;
  }

  return (
    <div className={styles.timezone}>
      <Combobox
        aria-label="Studio timezone"
        items={items}
        selectedKey={value}
        inputValue={inputValue}
        menuTrigger="focus"
        {...(isInvalid ? { isInvalid: true } : {})}
        onInputChange={setInputValue}
        onSelectionChange={(key) => {
          if (key == null) return;
          const id = String(key);
          onChange(id);
          setInputValue(id);
        }}
      >
        <InputGroup>
          <InputGroupAddon>
            <Icon name="globe" />
          </InputGroupAddon>
          <ComboboxInput
            placeholder="Search timezones"
            onBlur={() => setInputValue(value)}
          />
          <InputGroupAddon>
            <ComboboxButton aria-label="Show timezones">
              <Icon name="chevron-down" />
            </ComboboxButton>
          </InputGroupAddon>
        </InputGroup>
        <ComboboxPopover />
      </Combobox>
    </div>
  );
}

function Flow({ steps }: { steps: string[] }) {
  return (
    <ol className={styles.flow}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={styles.flowItem}
          data-current={index === 1 ? "true" : undefined}
        >
          {step}
          {index < steps.length - 1 ? (
            <span className={styles.arrow} aria-hidden>
              ↓
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function CardHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <header className={styles.cardHeader}>
      <span className={styles.cardIcon} aria-hidden>
        <Icon name={icon} />
      </span>
      <div className={styles.cardCopy}>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardHint}>{subtitle}</p>
      </div>
    </header>
  );
}

export function StudioBillingWorkspace({
  values,
  setField,
  platformFeePercent,
  isOwner,
  isDirty,
  isPending,
  showErrors = false,
  errors = {},
  saveError,
  onSave,
  onDiscard,
  leaveOpen = false,
  onStay,
  onLeaveWithoutSaving,
}: StudioBillingWorkspaceProps) {
  const graceDays = parseBoundedInteger(
    values.graceDays,
    GRACE_DAYS_MIN,
    GRACE_DAYS_MAX,
  );
  const expireAlertDays = parseBoundedInteger(
    values.expireAlertDays,
    EXPIRE_ALERT_DAYS_MIN,
    EXPIRE_ALERT_DAYS_MAX,
  );
  const admissionAmount = parseAmount(values.admissionFee);
  const admissionEnabled = isAdmissionEnabled(values.admissionFee);
  const timezoneLines = timezoneConfirmation(values.timezone);
  const saveLabel = isPending ? "Saving…" : "Save changes";

  return (
    <div
      className={styles.workspace}
      data-dirty={isDirty ? "true" : undefined}
      data-testid="billing-workspace"
    >
      <div className={styles.editor}>
        <section className={styles.card}>
          <CardHeader
            icon="calendar"
            title="Membership billing"
            subtitle="Control when membership payments are considered due and when students receive expiry reminders."
          />
          <div className={styles.pair}>
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Due days</p>
              <p className={styles.fieldHint}>
                Grace period after a membership payment is due.
              </p>
              <div className={styles.controlRow}>
                <DayStepper
                  label="Due days"
                  value={values.graceDays}
                  min={GRACE_DAYS_MIN}
                  max={GRACE_DAYS_MAX}
                  readOnly={!isOwner}
                  isInvalid={showErrors && Boolean(errors.graceDays)}
                  onChange={(next) => setField("graceDays", next)}
                />
                <span className={styles.suffix}>days</span>
              </div>
              {showErrors && errors.graceDays ? (
                <p className={styles.error} role="alert">
                  {errors.graceDays}
                </p>
              ) : null}
              {graceDays != null ? (
                <Flow
                  steps={[
                    "Payment due",
                    gracePeriodLabel(graceDays),
                    "Membership overdue",
                  ]}
                />
              ) : null}
            </div>

            <div className={styles.field}>
              <p className={styles.fieldLabel}>Expiry alert</p>
              <p className={styles.fieldHint}>
                Notify members before their membership expires.
              </p>
              <div className={styles.controlRow}>
                <DayStepper
                  label="Expiry alert"
                  value={values.expireAlertDays}
                  min={EXPIRE_ALERT_DAYS_MIN}
                  max={EXPIRE_ALERT_DAYS_MAX}
                  isInvalid={showErrors && Boolean(errors.expireAlertDays)}
                  onChange={(next) => setField("expireAlertDays", next)}
                />
                <span className={styles.suffix}>days before expiry</span>
              </div>
              {showErrors && errors.expireAlertDays ? (
                <p className={styles.error} role="alert">
                  {errors.expireAlertDays}
                </p>
              ) : null}
              {expireAlertDays != null ? (
                <Flow
                  steps={[
                    "Membership expires",
                    expiryReminderLabel(expireAlertDays),
                    "Expiry reminder",
                  ]}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <CardHeader
            icon="wallet"
            title="Admission fee"
            subtitle="One-time fee charged when a student enrolls for the first time."
          />
          <div className={styles.field}>
            <div className={styles.controlRow}>
              <p className={styles.fieldLabel}>Admission fee</p>
              <span
                className={styles.status}
                data-enabled={admissionEnabled ? "true" : "false"}
              >
                <span
                  className={styles.dot}
                  data-empty={admissionEnabled ? undefined : "true"}
                  aria-hidden
                />
                {admissionEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            {isOwner ? (
              <div
                className={styles.money}
                data-invalid={
                  showErrors && errors.admissionFee ? "true" : undefined
                }
              >
                <span className={styles.currency} aria-hidden>
                  ₹
                </span>
                <div className={styles.stepper}>
                  <NumberField
                    aria-label="Admission fee"
                    value={toNumberValue(values.admissionFee)}
                    minValue={0}
                    step={100}
                    formatOptions={{
                      maximumFractionDigits: 2,
                      useGrouping: true,
                    }}
                    {...(showErrors && errors.admissionFee
                      ? { isInvalid: true }
                      : {})}
                    onChange={(next) => {
                      if (Number.isNaN(next)) {
                        setField("admissionFee", "");
                        return;
                      }
                      setField("admissionFee", String(Math.max(0, next)));
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className={styles.readout}>
                {admissionAmount != null
                  ? formatAdmissionFee(admissionAmount)
                  : "—"}
              </p>
            )}
            <p className={styles.fieldHint}>
              Set to ₹0 to disable the admission fee.
            </p>
            {showErrors && errors.admissionFee ? (
              <p className={styles.error} role="alert">
                {errors.admissionFee}
              </p>
            ) : null}
          </div>
        </section>

        <section className={styles.card}>
          <CardHeader
            icon="globe"
            title="Time & locale"
            subtitle="Used for imports, billing dates, schedules, and other time-based studio operations."
          />
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Studio timezone</p>
            <TimezoneField
              value={values.timezone}
              readOnly={!isOwner}
              isInvalid={showErrors && Boolean(errors.timezone)}
              onChange={(next) => setField("timezone", next)}
            />
            {timezoneLines.length > 0 ? (
              <div className={styles.confirm}>
                {timezoneLines.map((line) => (
                  <p key={line} className={styles.confirmLine}>
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {showErrors && errors.timezone ? (
              <p className={styles.error} role="alert">
                {errors.timezone}
              </p>
            ) : null}
          </div>
        </section>

        <section className={styles.card} data-locked="true">
          <CardHeader
            icon="lock"
            title="Platform fee"
            subtitle="Platform-level billing configuration managed by Classa."
          />
          <div className={styles.field}>
            <p className={styles.fieldLabel}>Platform fee</p>
            <p className={styles.percent}>
              <span className={styles.srOnly}>Platform fee</span>
              <span className={styles.percentValue}>{platformFeePercent}</span>
              <span className={styles.suffix}>%</span>
            </p>
            <p className={styles.lockNote}>
              <Icon name="lock" />
              Managed by Classa
            </p>
          </div>
        </section>

        {saveError ? <p className={styles.saveError}>{saveError}</p> : null}

        <SettingsSaveBar
          isDirty={isDirty}
          isPending={isPending}
          onCancel={onDiscard}
          onSave={onSave}
          saveLabel={saveLabel}
          detail="Your billing settings haven't been saved."
          dock
        />
      </div>

      <aside className={styles.rail} aria-label="Billing summary">
        <section className={styles.summary} data-testid="billing-summary">
          <h2 className={styles.summaryTitle}>Billing summary</h2>
          <div className={styles.summaryGrid}>
            <article className={styles.metric}>
              <span className={styles.metricLabel}>Membership due</span>
              <strong className={styles.metricValue}>
                {graceDays != null ? `${graceDays} days grace` : "—"}
              </strong>
            </article>
            <article className={styles.metric}>
              <span className={styles.metricLabel}>Expiry reminder</span>
              <strong className={styles.metricValue}>
                {expireAlertDays != null
                  ? expiryReminderLabel(expireAlertDays)
                  : "—"}
              </strong>
            </article>
            <article className={styles.metric}>
              <span className={styles.metricLabel}>Admission fee</span>
              <strong className={styles.metricValue}>
                {admissionAmount != null
                  ? formatAdmissionFee(admissionAmount)
                  : "—"}
              </strong>
            </article>
            <article className={styles.metric}>
              <span className={styles.metricLabel}>Timezone</span>
              <strong className={styles.metricValue}>
                {values.timezone || "—"}
              </strong>
              {timezoneLines[1] ? (
                <span className={styles.metricMeta}>{timezoneLines[1]}</span>
              ) : null}
            </article>
          </div>
        </section>

        <section className={styles.how}>
          <h2 className={styles.howTitle}>How billing works</h2>
          <ol className={styles.steps}>
            {BILLING_STEPS.map((step, index) => (
              <li key={step} className={styles.step}>
                <span className={styles.stepIndex} aria-hidden>
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      {onStay && onLeaveWithoutSaving ? (
        <UnsavedChangesDialog
          isOpen={leaveOpen}
          onStay={onStay}
          onDiscard={onLeaveWithoutSaving}
        />
      ) : null}
    </div>
  );
}

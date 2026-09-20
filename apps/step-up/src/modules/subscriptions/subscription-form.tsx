import { Switch } from "@dev-ui/components/switch";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./subscription-form.module.scss";
import {
  audienceOrPackLabel,
  cadenceLabel,
  durationLabel,
  formatPlanPrice,
  kindLabel,
} from "./subscription-model";
import type {
  BillingCadence,
  IndividualAudience,
  StudioSubscription,
} from "./subscription-types";

export type SubscriptionFormValues = {
  name: string;
  individualAudience: IndividualAudience;
  billingCadence: Exclude<BillingCadence, "YEARLY">;
  price: string;
  active: boolean;
};

export type SubscriptionFormSubmit = {
  name: string;
  individualAudience: IndividualAudience;
  billingCadence: Exclude<BillingCadence, "YEARLY">;
  price: number;
  active: boolean;
};

type SubscriptionFormProps = {
  mode: "create" | "edit";
  subscription?: StudioSubscription;
  isPending?: boolean;
  onSubmit: (values: SubscriptionFormSubmit) => void;
  canDelete?: boolean;
  inUseHint?: string | null;
  onDelete?: () => void;
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className={styles.sectionLabel} id={`${label}-label`}>
        {label}
      </p>
      <fieldset className={styles.segmented} aria-labelledby={`${label}-label`}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            className={styles.segment}
            data-selected={value === option.id ? "true" : undefined}
            disabled={disabled}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

export function valuesFromSubscription(
  subscription: StudioSubscription,
): SubscriptionFormValues {
  return {
    name: subscription.name,
    individualAudience:
      subscription.individualAudience === "KID" ? "KID" : "ADULT",
    billingCadence:
      subscription.billingCadence === "QUARTERLY" ? "QUARTERLY" : "MONTHLY",
    price: String(subscription.price),
    active: subscription.active,
  };
}

export function SubscriptionForm({
  mode,
  subscription,
  isPending,
  onSubmit,
  canDelete,
  inUseHint,
  onDelete,
}: SubscriptionFormProps) {
  const [values, setValues] = useState<SubscriptionFormValues>(() =>
    subscription
      ? valuesFromSubscription(subscription)
      : {
          name: "",
          individualAudience: "ADULT",
          billingCadence: "MONTHLY",
          price: "1500",
          active: true,
        },
  );

  const previewName = values.name.trim() || "Untitled plan";
  const previewAudience =
    mode === "edit" && subscription
      ? audienceOrPackLabel(subscription)
      : values.individualAudience === "KID"
        ? "Kid"
        : "Adult";
  const canSave = Boolean(values.name.trim()) && Number(values.price) >= 0;

  function patch<K extends keyof SubscriptionFormValues>(
    key: K,
    value: SubscriptionFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className={styles.workspace}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          onSubmit({
            name: values.name.trim(),
            individualAudience: values.individualAudience,
            billingCadence: values.billingCadence,
            price: Number(values.price),
            active: values.active,
          });
        }}
      >
        <FormInput
          label="Plan name"
          value={values.name}
          onChange={(name) => patch("name", name)}
          required
        />

        {mode === "edit" && subscription ? (
          <div className={styles.readonly}>
            <p className={styles.sectionLabel}>
              {subscription.kind === "FAMILY"
                ? "Family pack"
                : "Target audience"}
            </p>
            <span className={styles.readonlyValue}>
              {kindLabel(subscription.kind)} ·{" "}
              {audienceOrPackLabel(subscription)}
            </span>
          </div>
        ) : (
          <Segmented
            label="Target audience"
            value={values.individualAudience}
            onChange={(individualAudience) =>
              patch("individualAudience", individualAudience)
            }
            options={[
              { id: "ADULT", label: "Adult" },
              { id: "KID", label: "Kid" },
            ]}
          />
        )}

        <Segmented
          label="Billing period"
          value={values.billingCadence}
          onChange={(billingCadence) => patch("billingCadence", billingCadence)}
          options={[
            { id: "MONTHLY", label: "Monthly" },
            { id: "QUARTERLY", label: "Quarterly" },
          ]}
        />

        <div className={styles.priceField}>
          <p className={styles.sectionLabel}>Price</p>
          <div className={styles.priceWrap}>
            <span className={styles.currency} aria-hidden>
              ₹
            </span>
            <input
              className={styles.priceInput}
              aria-label="Price amount"
              type="number"
              min="0"
              inputMode="numeric"
              value={values.price}
              onChange={(event) => patch("price", event.target.value)}
            />
          </div>
        </div>

        <div className={styles.readonly}>
          <p className={styles.sectionLabel}>Duration</p>
          <span className={styles.readonlyValue}>
            {durationLabel(values.billingCadence)}
          </span>
          <p className={styles.hint}>Follows the selected billing period.</p>
        </div>

        <div>
          <div className={styles.switchRow}>
            <span className={styles.sectionLabel}>Auto renew</span>
            <Switch isSelected isDisabled aria-label="Auto renew" />
          </div>
          <p className={styles.hint}>
            Memberships renew automatically on this billing period.
          </p>
        </div>

        <Segmented
          label="Availability"
          value={values.active ? "active" : "draft"}
          onChange={(next) => patch("active", next === "active")}
          options={[
            { id: "active", label: "Active" },
            { id: "draft", label: "Draft" },
          ]}
        />

        <div className={styles.actions}>
          <TouchButton
            as={Link}
            to="/app/subscriptions"
            variant="quiet"
            size="md"
          >
            Cancel
          </TouchButton>
          <TouchButton
            type="submit"
            variant="primary"
            size="md"
            isPending={isPending}
            isDisabled={!canSave}
          >
            {mode === "create" ? "Create plan" : "Save changes"}
          </TouchButton>
        </div>

        {mode === "edit" ? (
          <div className={styles.dangerZone}>
            {canDelete ? (
              <TouchButton
                variant="danger"
                data-testid="delete-subscription"
                onClick={onDelete}
              >
                Delete plan
              </TouchButton>
            ) : inUseHint ? (
              <p className={staff.panelDesc}>{inUseHint}</p>
            ) : null}
          </div>
        ) : null}
      </form>

      <aside className={styles.preview} aria-label="Plan preview">
        <header className={styles.previewHeader}>
          <h2 className={styles.previewTitle}>Plan preview</h2>
          <p className={styles.hint}>How this plan will appear to staff.</p>
        </header>
        <div
          className={styles.previewCard}
          data-testid="subscription-plan-preview"
        >
          <strong>{previewName}</strong>
          <span className={styles.previewPrice}>
            {formatPlanPrice(Number(values.price) || 0, values.billingCadence)}
          </span>
          <p className={styles.previewMeta}>
            {previewAudience} · {cadenceLabel(values.billingCadence)} ·{" "}
            {values.active ? "Active" : "Draft"}
          </p>
        </div>
      </aside>
    </div>
  );
}

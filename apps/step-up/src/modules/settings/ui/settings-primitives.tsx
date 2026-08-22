import type { ReactNode } from "react";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./settings-ui.module.scss";

type SettingsSaveBarProps = {
  isDirty: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  message?: string;
};

export function SettingsSaveBar({
  isDirty,
  isPending = false,
  onCancel,
  onSave,
  saveLabel = "Save changes",
  message = "Unsaved changes",
}: SettingsSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div className={styles.saveBar} role="status">
      <p className={styles.saveBarMessage}>{message}</p>
      <div className={styles.saveBarActions}>
        <TouchButton
          variant="quiet"
          size="sm"
          isDisabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </TouchButton>
        <TouchButton
          variant="primary"
          size="sm"
          isPending={isPending}
          onClick={onSave}
        >
          {saveLabel}
        </TouchButton>
      </div>
    </div>
  );
}

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description ? (
          <p className={styles.sectionDescription}>{description}</p>
        ) : null}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

type SettingsFieldProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function SettingsField({
  label,
  description,
  children,
}: SettingsFieldProps) {
  return (
    <div className={styles.field}>
      <p className={styles.fieldLabel}>{label}</p>
      {description ? (
        <p className={styles.fieldDescription}>{description}</p>
      ) : null}
      <div className={styles.fieldControl}>{children}</div>
    </div>
  );
}

type SettingsRowProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function SettingsRow({
  label,
  description,
  children,
}: SettingsRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowCopy}>
        <p className={styles.rowLabel}>{label}</p>
        {description ? (
          <p className={styles.rowDescription}>{description}</p>
        ) : null}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

type SettingsToggleRowProps = {
  name: string;
  description: string;
  enabled: boolean;
  icon?: ReactNode;
  control: ReactNode;
  testId?: string;
};

export function SettingsToggleRow({
  name,
  description,
  enabled,
  icon,
  control,
  testId,
}: SettingsToggleRowProps) {
  return (
    <div
      className={styles.toggleRow}
      data-enabled={enabled ? "true" : "false"}
      data-testid={testId}
    >
      {icon ? (
        <span className={styles.toggleIcon} aria-hidden>
          {icon}
        </span>
      ) : null}
      <div className={styles.toggleCopy}>
        <div className={styles.toggleNameRow}>
          <p className={styles.toggleName}>{name}</p>
          <span className={styles.toggleStatus}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <p className={styles.toggleDescription}>{description}</p>
      </div>
      <div className={styles.toggleControl}>{control}</div>
    </div>
  );
}

type SettingsComingSoonProps = {
  title: string;
  description?: string;
};

export function SettingsComingSoon({
  title,
  description = "This settings page is not available yet.",
}: SettingsComingSoonProps) {
  return (
    <div className={styles.comingSoon}>
      <p className={styles.comingSoonTitle}>{title}</p>
      <p className={styles.comingSoonBody}>{description}</p>
    </div>
  );
}

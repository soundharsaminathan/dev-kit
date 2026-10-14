import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./temporary-credentials-panel.module.scss";

type TemporaryCredentialsPanelProps = {
  email: string;
  temporaryPassword: string;
  eyebrow?: string;
  title?: string;
  helpText?: string;
  onCopy: (label: string, value: string) => void;
};

export function TemporaryCredentialsPanel({
  email,
  temporaryPassword,
  eyebrow = "Login access",
  title = "Temporary login",
  helpText = "This password is shown once. They must set a new password on first login.",
  onCopy,
}: TemporaryCredentialsPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.list}>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Email</p>
            <p className={styles.value}>{email}</p>
          </div>
          <TouchButton
            variant="quiet"
            type="button"
            onClick={() => onCopy("Email", email)}
          >
            Copy
          </TouchButton>
        </div>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Temporary password</p>
            <p className={styles.value} data-testid="temp-password-value">
              {temporaryPassword}
            </p>
          </div>
          <TouchButton
            variant="quiet"
            type="button"
            onClick={() => onCopy("Temporary password", temporaryPassword)}
          >
            Copy
          </TouchButton>
        </div>
      </div>
      <p className={styles.help}>{helpText}</p>
    </div>
  );
}

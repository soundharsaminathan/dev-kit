import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Screen } from "@/modules/ui/screen";
import styles from "./account-security-page.module.scss";

type AccountSecurityPageProps = {
  backTo?: string;
  changeEmailTo?: string;
  changePasswordTo?: string;
};

export function AccountSecurityPage({
  backTo = "/me/profile",
  changeEmailTo = "/me/profile/change-email",
  changePasswordTo = "/me/profile/change-password",
}: AccountSecurityPageProps) {
  const { user, hasPasswordProvider, emailVerified } = useAuth();
  const signInMethod = hasPasswordProvider ? "Email and password" : "Google";
  const verificationLabel = hasPasswordProvider
    ? emailVerified
      ? "Verified"
      : "Unverified"
    : "Managed by Google";

  return (
    <Screen title="Account security" showBack backTo={backTo}>
      <div className={styles.root}>
        <p className={styles.description}>
          Manage the email and password used to sign in to your account.
        </p>

        <section className={styles.infoCard} aria-label="Sign-in details">
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email ?? "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Status</span>
            <span
              className={styles.infoValue}
              data-tone={hasPasswordProvider && !emailVerified ? "warn" : "ok"}
            >
              {verificationLabel}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Sign-in</span>
            <span className={styles.infoValue}>{signInMethod}</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Login &amp; recovery</h2>
          <ul className={styles.menuCard}>
            <li>
              <Link to={changeEmailTo} className={styles.menuRow}>
                <span className={styles.menuIcon}>
                  <Icon name="mail" />
                </span>
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Change email</span>
                  <span className={styles.menuHint}>
                    {hasPasswordProvider
                      ? "Update the address on this account"
                      : "Requires an email-and-password account"}
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
            <li>
              <Link to={changePasswordTo} className={styles.menuRow}>
                <span className={styles.menuIcon}>
                  <Icon name="lock" />
                </span>
                <span className={styles.menuText}>
                  <span className={styles.menuLabel}>Change password</span>
                  <span className={styles.menuHint}>
                    {hasPasswordProvider
                      ? "Choose a new password for sign-in"
                      : "Requires an email-and-password account"}
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </Screen>
  );
}

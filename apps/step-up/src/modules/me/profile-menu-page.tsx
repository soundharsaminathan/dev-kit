import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  getMenuSections,
  type ShellVariant,
} from "@/modules/layout/nav-config";
import { Screen } from "@/modules/ui/screen";
import styles from "./profile-menu-page.module.scss";

type ProfileMenuPageProps = {
  variant?: ShellVariant;
};

export function ProfileMenuPage({ variant = "me" }: ProfileMenuPageProps) {
  const { user, signOutUser } = useAuth();
  const sections = getMenuSections(variant);
  const editTo = variant === "app" ? "/app/profile/edit" : "/me/profile/edit";
  const followRequestsTo =
    variant === "app"
      ? "/app/profile/follow-requests"
      : "/me/profile/follow-requests";

  return (
    <Screen title="Profile">
      <div className={styles.root}>
        <Link to={editTo} className={styles.profileCard}>
          <Avatar size="lg">
            {user?.photoUrl ? (
              <AvatarImage src={user.photoUrl} alt={user.name} />
            ) : null}
            <AvatarFallback>
              {user?.name?.slice(0, 1) || <Icon name="user" />}
            </AvatarFallback>
          </Avatar>
          <span className={styles.profileText}>
            <span className={styles.profileName}>
              {user?.name ?? "Your profile"}
            </span>
            <span className={styles.profileHint}>
              View and edit your profile
            </span>
          </span>
          <Icon name="chevron-right" className={styles.chevron} />
        </Link>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Social</h2>
          <ul className={styles.menuCard}>
            <li>
              <Link to={followRequestsTo} className={styles.menuRow}>
                <span className={styles.menuIcon}>
                  <Icon name="users" />
                </span>
                <span className={styles.menuLabel}>Follow requests</span>
                <Icon name="chevron-right" className={styles.chevron} />
              </Link>
            </li>
          </ul>
        </section>

        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <ul className={styles.menuCard}>
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={styles.menuRow}
                    activeOptions={{ exact: link.exact ?? false }}
                  >
                    <span className={styles.menuIcon}>
                      <Icon name={link.icon} />
                    </span>
                    <span className={styles.menuLabel}>{link.label}</span>
                    <Icon name="chevron-right" className={styles.chevron} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className={styles.section}>
          <ul className={styles.menuCard}>
            <li>
              <button
                type="button"
                className={`${styles.menuRow} ${styles.signOutRow}`}
                onClick={() => {
                  void signOutUser();
                }}
              >
                <span className={`${styles.menuIcon} ${styles.signOutIcon}`}>
                  <Icon name="log-out" />
                </span>
                <span className={styles.menuLabel}>Sign out</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </Screen>
  );
}

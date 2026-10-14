import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Icon } from "@dev-ui/icons";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import styles from "@/modules/me/profile-menu-page.module.scss";
import { Screen } from "@/modules/ui/screen";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { user, signOutUser } = useAuth();

  return (
    <Screen title="Profile">
      <div className={styles.root}>
        <div className={styles.profileCard}>
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
              {user?.name ?? "System admin"}
            </span>
            <span className={styles.profileHint}>
              {user?.email ?? "Platform administrator"}
            </span>
          </span>
        </div>

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

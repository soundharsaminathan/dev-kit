import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { useStudioId } from "@/lib/use-studio-id";
import menu from "@/modules/me/profile-menu-page.module.scss";
import { InstallAppPanel } from "@/modules/pwa/install-app-panel";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { Studio } from "./types";

type SettingsLink = {
  to:
    | "/app/settings/profile"
    | "/app/settings/branding"
    | "/app/settings/theme"
    | "/app/settings/billing"
    | "/app/settings/payments"
    | "/app/settings/styles"
    | "/app/settings/team";
  label: string;
  hint: string;
  icon:
    | "building"
    | "image"
    | "palette"
    | "file-text"
    | "credit-card"
    | "sparkles"
    | "users";
  ownerOnly?: boolean;
  adminOnly?: boolean;
};

const LINKS: SettingsLink[] = [
  {
    to: "/app/settings/profile",
    label: "Studio profile",
    hint: "Name, address, and contact",
    icon: "building",
  },
  {
    to: "/app/settings/branding",
    label: "Branding",
    hint: "Logo and home hero images",
    icon: "image",
    ownerOnly: true,
  },
  {
    to: "/app/settings/theme",
    label: "Theme",
    hint: "Studio colors",
    icon: "palette",
    ownerOnly: true,
  },
  {
    to: "/app/settings/styles",
    label: "Dance styles",
    hint: "Styles offered at this studio",
    icon: "sparkles",
    ownerOnly: true,
  },
  {
    to: "/app/settings/billing",
    label: "Billing",
    hint: "Due days, alerts, and fees",
    icon: "file-text",
  },
  {
    to: "/app/settings/payments",
    label: "Payments",
    hint: "Razorpay keys",
    icon: "credit-card",
    ownerOnly: true,
  },
  {
    to: "/app/settings/team",
    label: "Team invites",
    hint: "Invite staff and trainers",
    icon: "users",
    adminOnly: true,
  },
];

export function SettingsMenuPage() {
  const api = useApi();
  const studioId = useStudioId();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "OWNER" || user?.role === "STAFF";

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const visibleLinks = LINKS.filter((link) => {
    if (link.ownerOnly && !isOwner) return false;
    if (link.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <Screen
      title="Studio settings"
      subtitle="Manage studio profile, billing, payments, and team."
    >
      {studioQuery.isLoading ? (
        <div className={staff.sheetStack}>
          <SkeletonBlock height="6rem" radius="var(--radius-2xl)" />
          <SkeletonBlock height="10rem" radius="var(--radius-2xl)" />
        </div>
      ) : null}

      {studioQuery.isError ? (
        <ErrorState
          description={
            studioQuery.error instanceof Error
              ? studioQuery.error.message
              : "Unable to load studio settings."
          }
          action={
            <TouchButton
              variant="primary"
              onClick={() => studioQuery.refetch()}
            >
              Try again
            </TouchButton>
          }
        />
      ) : null}

      {studioQuery.isFetched && !studioQuery.data ? (
        <EmptyState
          title="Studio not found"
          description="Unable to load studio settings."
        />
      ) : null}

      {studioQuery.data ? (
        <div className={menu.root}>
          <div className={staff.section}>
            <InstallAppPanel />
          </div>

          <Link to="/app/settings/profile" className={menu.profileCard}>
            <span className={menu.menuIcon}>
              <Icon name="building" />
            </span>
            <span className={menu.profileText}>
              <span className={menu.profileName}>{studioQuery.data.name}</span>
              <span className={menu.profileHint}>
                {studioQuery.data.settings?.razorpayConfigured
                  ? "Razorpay configured"
                  : "Demo checkout until Razorpay keys are set"}
              </span>
            </span>
            <Icon name="chevron-right" className={menu.chevron} />
          </Link>

          <section className={menu.section}>
            <h2 className={menu.sectionTitle}>Settings</h2>
            <ul className={menu.menuCard}>
              {visibleLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={menu.menuRow}>
                    <span className={menu.menuIcon}>
                      <Icon name={link.icon} />
                    </span>
                    <span className={menu.profileText}>
                      <span className={menu.menuLabel}>{link.label}</span>
                      <span className={menu.profileHint}>{link.hint}</span>
                    </span>
                    <Icon name="chevron-right" className={menu.chevron} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </Screen>
  );
}

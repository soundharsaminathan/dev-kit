import type { IconName } from "@dev-ui/icons";
import type { FeatureKey } from "@/lib/feature-keys";

export type SettingsNavKind = "internal" | "comingSoon";

export type SettingsNavItem = {
  id: string;
  label: string;
  icon: IconName;
  kind: SettingsNavKind;
  /** Internal settings path */
  to: string;
  ownerOnly?: boolean;
  adminOnly?: boolean;
  feature?: FeatureKey;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    id: "studio",
    label: "Studio",
    items: [
      {
        id: "profile",
        label: "Profile",
        icon: "building",
        kind: "internal",
        to: "/app/settings/profile",
      },
      {
        id: "branding",
        label: "Branding",
        icon: "image",
        kind: "internal",
        to: "/app/settings/branding",
        ownerOnly: true,
      },
      {
        id: "styles",
        label: "Dance styles",
        icon: "sparkles",
        kind: "internal",
        to: "/app/settings/styles",
        ownerOnly: true,
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        id: "billing",
        label: "Billing",
        icon: "file-text",
        kind: "internal",
        to: "/app/settings/billing",
      },
      {
        id: "payments",
        label: "Payments",
        icon: "credit-card",
        kind: "internal",
        to: "/app/settings/payments",
        ownerOnly: true,
        feature: "payments",
      },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        icon: "bell",
        kind: "comingSoon",
        to: "/app/settings/notifications",
      },
      {
        id: "chat",
        label: "Chat",
        icon: "message-square",
        kind: "comingSoon",
        to: "/app/settings/chat",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "team",
        label: "Team",
        icon: "users",
        kind: "internal",
        to: "/app/settings/team",
        adminOnly: true,
      },
      {
        id: "integrations",
        label: "Integrations",
        icon: "link",
        kind: "comingSoon",
        to: "/app/settings/integrations",
      },
    ],
  },
];

export type SettingsNavVisibility = {
  isOwner: boolean;
  isAdmin: boolean;
  isFeatureEnabled: (key: FeatureKey) => boolean;
};

export function filterSettingsNav(
  groups: SettingsNavGroup[],
  visibility: SettingsNavVisibility,
): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.ownerOnly && !visibility.isOwner) return false;
        if (item.adminOnly && !visibility.isAdmin) return false;
        if (item.feature && !visibility.isFeatureEnabled(item.feature)) {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function findSettingsNavItem(
  pathname: string,
  groups: SettingsNavGroup[],
): SettingsNavItem | undefined {
  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return item;
      }
    }
  }
  return undefined;
}

export const SETTINGS_PAGE_META: Record<
  string,
  { title: string; subtitle: string }
> = {
  "/app/settings/profile": {
    title: "Studio profile",
    subtitle: "Your studio's basic information used throughout classa.",
  },
  "/app/settings/branding": {
    title: "Branding",
    subtitle: "Logo and member home hero images.",
  },
  "/app/settings/styles": {
    title: "Dance styles",
    subtitle: "Styles students and trainers can pick at this studio.",
  },
  "/app/settings/billing": {
    title: "Billing",
    subtitle: "Due days, expiry alerts, admission fee, and timezone.",
  },
  "/app/settings/payments": {
    title: "Payments",
    subtitle: "Configure GST and Razorpay for student checkout.",
  },
  "/app/settings/team": {
    title: "Team",
    subtitle: "Invite staff and trainers to your studio.",
  },
  "/app/settings/notifications": {
    title: "Notifications",
    subtitle: "Studio notification preferences.",
  },
  "/app/settings/chat": {
    title: "Chat",
    subtitle: "Messaging defaults for staff and students.",
  },
  "/app/settings/integrations": {
    title: "Integrations",
    subtitle: "Connect third-party tools to classa.",
  },
};

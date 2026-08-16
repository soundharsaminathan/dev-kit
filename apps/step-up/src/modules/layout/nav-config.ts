import type { IconName } from "@dev-ui/icons";
import {
  ADMIN_ROLES,
  MEMBER_ROLES,
  STAFF_ROLES,
  SYSTEM_ADMIN_ROLES,
  type UserRole,
} from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";

export type ShellVariant = "app" | "me" | "admin";

export type NavLinkItem = {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  section: string;
  primary?: boolean;
  /** Defaults to true. Set false to keep the link out of the desktop sidebar (e.g. mobile-only tabs). */
  sidebar?: boolean;
  /** Defaults to STAFF_ROLES (app), MEMBER_ROLES (me), or SYSTEM_ADMIN_ROLES (admin). */
  roles?: UserRole[];
};

export type NavSection = {
  title: string;
  links: NavLinkItem[];
};

const appLinks: NavLinkItem[] = [
  {
    to: "/app",
    label: "Home",
    icon: "home",
    exact: true,
    section: "Studio",
    primary: true,
  },
  {
    to: "/app/batches",
    label: "Batches",
    icon: ENTITY_ICONS.batch,
    section: "People",
    primary: true,
  },
  {
    to: "/app/leads",
    label: "Trial caller",
    icon: "phone-call",
    section: "People",
    primary: true,
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/messages",
    label: "Messages",
    icon: "message-square",
    section: "Studio",
    primary: true,
    sidebar: false,
  },
  {
    to: "/app/calendar",
    label: "Calendar",
    icon: "calendar",
    section: "Studio",
  },
  {
    to: "/app/profile",
    label: "Profile",
    icon: "user",
    section: "Admin",
    primary: true,
  },
  {
    to: "/app/feed",
    label: "Feed",
    icon: "image",
    section: "Studio",
  },
  {
    to: "/app/students",
    label: "Students",
    icon: ENTITY_ICONS.student,
    section: "People",
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/bookings",
    label: "Bookings",
    icon: "book-open",
    section: "Ops",
  },
  {
    to: "/app/trainers",
    label: "Trainers",
    icon: ENTITY_ICONS.trainer,
    section: "People",
  },
  {
    to: "/app/locations",
    label: "Locations",
    icon: "map-pin",
    section: "Ops",
  },
  {
    to: "/app/subscriptions",
    label: "Subscriptions",
    icon: "clipboard",
    section: "Ops",
    roles: ADMIN_ROLES,
  },
  { to: "/app/contests", label: "Contests", icon: "star", section: "Ops" },
  {
    to: "/app/certificates",
    label: "Certificates",
    icon: "badge-check",
    section: "Ops",
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/invoices",
    label: "Invoices",
    icon: "file-text",
    section: "Money",
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/payments",
    label: "Payments",
    icon: "credit-card",
    section: "Money",
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/expenses",
    label: "Expenses",
    icon: "wallet",
    section: "Money",
    roles: ADMIN_ROLES,
  },
  {
    to: "/app/payouts",
    label: "Payouts",
    icon: "wallet",
    section: "Money",
  },
  {
    to: "/app/retention",
    label: "Retention",
    icon: "trending-up",
    section: "Money",
  },
  {
    to: "/app/settings",
    label: "Settings",
    icon: "settings",
    section: "Admin",
    roles: ADMIN_ROLES,
  },
];

const memberLinks: NavLinkItem[] = [
  {
    to: "/me",
    label: "Home",
    icon: "home",
    exact: true,
    section: "My dance",
    primary: true,
  },
  {
    to: "/me/book",
    label: "Discover",
    icon: "search",
    section: "Activity",
    primary: true,
  },
  {
    to: "/me/trainers",
    label: "Trainers",
    icon: ENTITY_ICONS.trainer,
    section: "Activity",
  },
  {
    to: "/me/messages",
    label: "Messages",
    icon: "message-square",
    section: "My dance",
    primary: true,
  },
  {
    to: "/me/profile",
    label: "Profile",
    icon: "user",
    section: "Account",
    primary: true,
  },
  {
    to: "/me/feed",
    label: "Feed",
    icon: "image",
    section: "My dance",
  },
  {
    to: "/me/bookings",
    label: "Bookings",
    icon: "book-open",
    section: "Activity",
  },
  {
    to: "/me/locations",
    label: "Locations",
    icon: "map-pin",
    section: "Activity",
  },
  {
    to: "/me/calendar",
    label: "Calendar",
    icon: "calendar",
    section: "Activity",
  },
  {
    to: "/me/journey",
    label: "Journey",
    icon: "map",
    section: "Activity",
  },
  {
    to: "/me/attendance",
    label: "Attendance",
    icon: "badge-check",
    section: "Activity",
  },
  {
    to: "/me/check-in",
    label: "Check in",
    icon: "check-circle",
    section: "Activity",
  },
  {
    to: "/me/contests",
    label: "Contests",
    icon: "star",
    section: "Activity",
  },
  {
    to: "/me/subscriptions",
    label: "Subscriptions",
    icon: "clipboard",
    section: "Account",
  },
  {
    to: "/me/invoices",
    label: "Invoices",
    icon: "file-text",
    section: "Account",
  },
];

const adminLinks: NavLinkItem[] = [
  {
    to: "/admin",
    label: "Studios",
    icon: "building",
    exact: true,
    section: "Platform",
    primary: true,
  },
  {
    to: "/admin/profile",
    label: "Profile",
    icon: "user",
    section: "Account",
    primary: true,
  },
];

function defaultRolesFor(variant: ShellVariant): UserRole[] {
  if (variant === "app") return STAFF_ROLES;
  if (variant === "admin") return SYSTEM_ADMIN_ROLES;
  return MEMBER_ROLES;
}

function linkVisibleToRole(
  link: NavLinkItem,
  variant: ShellVariant,
  role: UserRole,
) {
  const allowed = link.roles ?? defaultRolesFor(variant);
  return allowed.includes(role);
}

function linksFor(variant: ShellVariant, role?: UserRole): NavLinkItem[] {
  const links =
    variant === "app"
      ? appLinks
      : variant === "admin"
        ? adminLinks
        : memberLinks;
  if (!role) {
    return links;
  }
  return links.filter((link) => linkVisibleToRole(link, variant, role));
}

export function getHeaderNavLinks(
  variant: ShellVariant,
  role?: UserRole,
  isMobile = false,
): NavLinkItem[] {
  if (variant === "app") {
    const links = linksFor(variant, role).filter(
      (link) => link.to === "/app/calendar" || link.to === "/app/feed",
    );
    if (!isMobile) {
      return links;
    }
    // Mobile keeps quick access to Messages instead of Calendar in the header.
    return links.map((link) =>
      link.to === "/app/calendar"
        ? {
            to: "/app/messages",
            label: "Messages",
            icon: "message-square",
            section: link.section,
          }
        : link,
    );
  }

  return [];
}

function groupBySection(links: NavLinkItem[]): NavSection[] {
  const sections: NavSection[] = [];
  const order: string[] = [];

  for (const link of links) {
    if (!order.includes(link.section)) {
      order.push(link.section);
    }
  }

  for (const title of order) {
    sections.push({
      title,
      links: links.filter((link) => link.section === title),
    });
  }

  return sections;
}

export function getSidebarSections(
  variant: ShellVariant,
  role?: UserRole,
): NavSection[] {
  return groupBySection(
    linksFor(variant, role).filter((link) => link.sidebar !== false),
  );
}

export function getMenuSections(
  variant: ShellVariant,
  role?: UserRole,
): NavSection[] {
  return groupBySection(getMoreLinks(variant, role));
}

export function getPrimaryTabs(
  variant: ShellVariant,
  role?: UserRole,
): NavLinkItem[] {
  return linksFor(variant, role).filter((link) => link.primary);
}

export function getMoreLinks(
  variant: ShellVariant,
  role?: UserRole,
): NavLinkItem[] {
  return linksFor(variant, role).filter((link) => !link.primary);
}

export function getProfilePath(variant: ShellVariant): string {
  if (variant === "app") return "/app/profile";
  if (variant === "admin") return "/admin/profile";
  return "/me/profile";
}

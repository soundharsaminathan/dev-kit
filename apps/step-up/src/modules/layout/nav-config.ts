import type { IconName } from "@dev-ui/icons";
import { ENTITY_ICONS } from "@/lib/entity-icons";

export type ShellVariant = "app" | "me";

export type NavLinkItem = {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  section: string;
  primary?: boolean;
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
    to: "/app/bookings",
    label: "Bookings",
    icon: "book-open",
    section: "Ops",
    primary: true,
  },
  {
    to: "/app/messages",
    label: "Messages",
    icon: "message-square",
    section: "Studio",
    primary: true,
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
  },
  {
    to: "/app/calendar",
    label: "Calendar",
    icon: "calendar",
    section: "Ops",
  },
  { to: "/app/contests", label: "Contests", icon: "star", section: "Ops" },
  {
    to: "/app/certificates",
    label: "Certificates",
    icon: "badge-check",
    section: "Ops",
  },
  {
    to: "/app/invoices",
    label: "Invoices",
    icon: "file-text",
    section: "Money",
  },
  {
    to: "/app/payments",
    label: "Payments",
    icon: "credit-card",
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
    primary: true,
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

function linksFor(variant: ShellVariant): NavLinkItem[] {
  return variant === "app" ? appLinks : memberLinks;
}

export function getHeaderNavLinks(variant: ShellVariant): NavLinkItem[] {
  if (variant === "app") {
    return [
      {
        to: "/app/calendar",
        label: "Calendar",
        icon: "calendar",
        section: "Header",
      },
      {
        to: "/app/feed",
        label: "Feed",
        icon: "image",
        section: "Header",
      },
    ];
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

export function getSidebarSections(variant: ShellVariant): NavSection[] {
  return groupBySection(linksFor(variant));
}

export function getMenuSections(variant: ShellVariant): NavSection[] {
  return groupBySection(getMoreLinks(variant));
}

export function getPrimaryTabs(variant: ShellVariant): NavLinkItem[] {
  return linksFor(variant).filter((link) => link.primary);
}

export function getMoreLinks(variant: ShellVariant): NavLinkItem[] {
  return linksFor(variant).filter((link) => !link.primary);
}

export function getProfilePath(variant: ShellVariant): string {
  return variant === "app" ? "/app/profile" : "/me/profile";
}

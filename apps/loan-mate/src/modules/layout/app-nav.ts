import type { IconName } from "@dev-ui/icons";
import type { UserRole } from "@/lib/constants";
import {
  APPROVAL_PAGE_ROLES,
  AUDIT_PAGE_ROLES,
  COLLECTION_PAGE_ROLES,
  PRODUCT_PAGE_ROLES,
  SETTINGS_PAGE_ROLES,
} from "@/lib/page-access";

export type AppNavItem = {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** When set, the link is hidden unless the signed-in role is listed. */
  roles?: readonly UserRole[];
};

export const APP_NAV: readonly AppNavItem[] = [
  { to: "/app", label: "Home", icon: "home", exact: true },
  { to: "/app/customers", label: "Customers", icon: "users" },
  {
    to: "/app/products",
    label: "Products",
    icon: "tag",
    roles: PRODUCT_PAGE_ROLES,
  },
  { to: "/app/loans", label: "Loans", icon: "wallet" },
  {
    to: "/app/approvals",
    label: "Approvals",
    icon: "badge-check",
    roles: APPROVAL_PAGE_ROLES,
  },
  {
    to: "/app/collections",
    label: "Collections",
    icon: "credit-card",
    roles: COLLECTION_PAGE_ROLES,
  },
  { to: "/app/users", label: "Employees", icon: "circle-user" },
  { to: "/app/branches", label: "Branches", icon: "building" },
  {
    to: "/app/audit",
    label: "Audit",
    icon: "file-text",
    roles: AUDIT_PAGE_ROLES,
  },
  { to: "/app/reports", label: "Reports", icon: "chart-bar" },
  { to: "/app/notifications", label: "Notifications", icon: "bell" },
  {
    to: "/app/settings",
    label: "Settings",
    icon: "settings",
    roles: SETTINGS_PAGE_ROLES,
  },
  { to: "/app/profile", label: "Profile", icon: "user" },
];

export function visibleAppNav(role: UserRole | undefined): AppNavItem[] {
  return APP_NAV.filter(
    (item) => !item.roles || (role != null && item.roles.includes(role)),
  );
}

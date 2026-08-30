import {
  SidebarItem,
  SidebarList,
  SidebarSection,
  SidebarSectionHeading,
} from "@dev-ui/components/sidebar";
import { Icon } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useAdminStudioId } from "@/modules/admin/use-admin-studio";
import styles from "./nav.module.scss";
import {
  getSidebarSections,
  type NavLinkItem,
  type ShellVariant,
} from "./nav-config";
import { useNavEnabledFeatures } from "./use-nav-enabled-features";

export function NavLink({ to, label, icon, exact, params }: NavLinkItem) {
  return (
    <Link
      to={to}
      {...(params ? { params } : {})}
      className={styles.link}
      activeOptions={{ exact: exact ?? false }}
      activeProps={{ className: `${styles.link} ${styles.linkActive}` }}
      aria-label={label}
    >
      <Icon name={icon} className={styles.icon} />
      <span data-sidebar-label="">{label}</span>
    </Link>
  );
}

export function SidebarNavSections({ variant }: { variant: ShellVariant }) {
  const { user } = useAuth();
  const enabledFeatures = useNavEnabledFeatures(variant);
  const studioId = useAdminStudioId();
  const sections = getSidebarSections(
    variant,
    user?.role,
    enabledFeatures,
    variant === "admin" ? studioId : undefined,
  );

  return (
    <>
      {sections.map((section) => (
        <SidebarSection key={section.title}>
          <SidebarSectionHeading>{section.title}</SidebarSectionHeading>
          <SidebarList>
            {section.links.map((link) => (
              <SidebarItem
                key={`${link.to}:${link.params?.id ?? ""}`}
                tooltip={link.label}
              >
                <span className={styles.trigger}>
                  <NavLink {...link} />
                </span>
              </SidebarItem>
            ))}
          </SidebarList>
        </SidebarSection>
      ))}
    </>
  );
}

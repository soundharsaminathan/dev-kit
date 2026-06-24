import { cn } from "@dev-ui/core";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { componentCategories } from "@/lib/components-data";
import { OverlayScope } from "./overlay-scope";
import styles from "./showcase-sidebar.module.scss";

export function ShowcaseSidebar() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.sidebar} aria-label="Components">
      {componentCategories.map((category) => (
        <div key={category.slug}>
          <h4 className={styles.sectionTitle}>{category.title}</h4>
          {category.components.map((component) => {
            const href = `/components/${component.slug}`;
            const isActive = pathname === href;
            return (
              <SidebarLink
                key={component.slug}
                href={href}
                label={component.name}
                isActive={isActive}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const el = ref.current;
    const scroller = el?.closest("nav");
    if (!el || !scroller) return;
    const er = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    if (er.top < sr.top || er.bottom > sr.bottom) {
      el.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [isActive]);

  return (
    <Link
      ref={ref}
      to={href}
      className={cn(styles.link, isActive && styles.linkActive)}
    >
      {label}
    </Link>
  );
}

export function ComponentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <ShowcaseSidebar />
      </aside>
      <OverlayScope className={styles.content}>{children}</OverlayScope>
    </div>
  );
}

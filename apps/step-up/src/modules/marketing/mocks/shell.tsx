import type { ReactNode } from "react";
import { OWNER, STUDIO } from "./data";
import styles from "./mocks.module.scss";
import { MockNavIcon } from "./nav-icons";
import { RhythmHouseLogo } from "./rhythm-house-logo";

export type MockNavId =
  | "home"
  | "batches"
  | "leads"
  | "calendar"
  | "students"
  | "invoices"
  | "certificates"
  | "attendance"
  | "profile";

const SIDEBAR: { id: MockNavId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "batches", label: "Batches" },
  { id: "leads", label: "Trial caller" },
  { id: "calendar", label: "Calendar" },
  { id: "students", label: "Students" },
  { id: "invoices", label: "Invoices" },
  { id: "profile", label: "Profile" },
];

const TABS: MockNavId[] = ["home", "batches", "leads", "calendar", "profile"];

function sidebarActive(nav: MockNavId): MockNavId {
  if (nav === "attendance") return "batches";
  if (nav === "certificates") return "home";
  return nav;
}

function tabActive(nav: MockNavId): MockNavId {
  if (nav === "attendance") return "batches";
  if (nav === "certificates") return "home";
  if (nav === "leads") return "leads";
  if (nav === "students" || nav === "invoices") return "profile";
  if (nav === "calendar") return "calendar";
  if (nav === "batches") return "batches";
  if (nav === "home") return "home";
  return "profile";
}

export function MockApp({
  nav,
  title,
  subtitle,
  showBack = false,
  hideSidebar = false,
  action,
  children,
}: {
  nav: MockNavId;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  hideSidebar?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const side = sidebarActive(nav);
  const tab = tabActive(nav);

  return (
    <div
      className={styles.app}
      data-hide-sidebar={hideSidebar ? "true" : undefined}
    >
      <aside className={styles.sidebar} aria-hidden>
        <div className={styles.sidebarHead}>
          <RhythmHouseLogo />
        </div>
        <nav className={styles.sideNav}>
          {SIDEBAR.map((item) => (
            <span
              key={item.id}
              className={styles.sideLink}
              data-active={item.id === side ? "true" : undefined}
            >
              <MockNavIcon id={item.id} className={styles.sideIcon} />
              {item.label}
            </span>
          ))}
        </nav>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topBar} aria-hidden>
          <span className={styles.topBrand}>{STUDIO}</span>
          <span className={styles.topAvatar}>{OWNER.slice(0, 1)}</span>
        </header>

        <header className={styles.screenHead}>
          {showBack ? <span className={styles.back} /> : null}
          <div className={styles.titleBlock}>
            <p className={styles.title}>{title}</p>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {action ? <div className={styles.headAction}>{action}</div> : null}
        </header>

        <div className={styles.body}>{children}</div>

        <nav className={styles.bottomBar} aria-hidden>
          {TABS.map((id) => (
            <span
              key={id}
              className={styles.tab}
              data-active={id === tab ? "true" : undefined}
            >
              <MockNavIcon id={id} className={styles.tabIcon} />
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}

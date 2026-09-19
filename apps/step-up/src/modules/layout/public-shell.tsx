import { Button } from "@dev-ui/components/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import { BRAND_ICON_SRC } from "@/lib/brand";
import { homePathForUser } from "@/lib/require-auth";
import { useDismissBootPublic } from "@/lib/use-dismiss-boot-public";
import { ClassaWordmark } from "@/modules/branding/classa-wordmark";
import { FOOTER, NAV } from "@/modules/marketing/content";
import { DiscoverCityProvider } from "@/modules/student-landing/city-context";
import { CitySwitcher } from "@/modules/student-landing/city-switcher";
import {
  STUDENT_FOOTER,
  STUDENT_NAV,
  STUDIO_NAV_EXTRA,
} from "@/modules/student-landing/content";
import { DEFAULT_CITY_ID } from "@/modules/student-landing/types";
import { useDiscoverLanding } from "@/modules/student-landing/use-landing";
import { ThemeSwitcher } from "@/modules/ui/theme-switcher";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./public-shell.module.scss";

type PublicShellProps = {
  children: ReactNode;
  /** `student` consumer landing; `marketing` studio landing; `minimal` auth pages. */
  nav?: "minimal" | "marketing" | "student";
  /** `full` removes main max-width clamp for edge-to-edge sections. */
  width?: "prose" | "full";
  /** Extra footer padding so a page dock does not cover legal links. */
  dock?: boolean;
};

type HashLink = { label: string; href: string };
type RouteLink = { label: string; to: "/for-studios" | "/" };

function SearchIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <title>Search</title>
      <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
    </svg>
  );
}

export function PublicShell({
  children,
  nav = "minimal",
  width = "prose",
  dock = false,
}: PublicShellProps) {
  useDismissBootPublic();
  const { user, loading } = useAuth();
  const appHome = user ? homePathForUser(user) : null;
  const isMarketing = nav === "marketing";
  const isStudent = nav === "student";
  const isLanding = isMarketing || isStudent;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStudentHome = isStudent && pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const hashLinks = useMemo((): HashLink[] => {
    if (isStudent) {
      return STUDENT_NAV.links.flatMap((link) =>
        "href" in link ? [{ label: link.label, href: link.href }] : [],
      );
    }
    if (isMarketing) return [...NAV.links];
    return [];
  }, [isMarketing, isStudent]);

  const routeLinks = useMemo((): RouteLink[] => {
    if (isStudent) {
      return STUDENT_NAV.links.flatMap((link) =>
        "to" in link ? [{ label: link.label, to: link.to }] : [],
      );
    }
    if (isMarketing) {
      return [{ label: STUDIO_NAV_EXTRA.forStudents, to: "/" }];
    }
    return [];
  }, [isMarketing, isStudent]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    const panel = menuRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    focusables?.[0]?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!isLanding || hashLinks.length === 0) return;

    let observer: IntersectionObserver | null = null;

    const connect = () => {
      const els = hashLinks
        .map((link) => document.getElementById(link.href.slice(1)))
        .filter((el): el is HTMLElement => Boolean(el));
      if (els.length === 0) return false;

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const top = visible[0]?.target;
          if (top?.id) setActiveHref(`#${top.id}`);
        },
        { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.2, 0.5] },
      );
      for (const el of els) observer.observe(el);
      return true;
    };

    if (connect()) return () => observer?.disconnect();

    const id = window.setInterval(() => {
      if (connect()) window.clearInterval(id);
    }, 400);

    return () => {
      window.clearInterval(id);
      observer?.disconnect();
    };
  }, [isLanding, hashLinks]);

  const shellClass = [
    styles.shell,
    isMarketing ? styles.shellMarketing : "",
    isStudent ? styles.shellStudent : "",
  ]
    .filter(Boolean)
    .join(" ");

  const mainClass = [
    styles.main,
    width === "full" ? styles.mainFull : "",
    isStudent ? styles.mainStudent : "",
  ]
    .filter(Boolean)
    .join(" ");

  const studentActions =
    !loading &&
    (appHome ? (
      <Link to={appHome}>
        <Button variant="primary">Open app</Button>
      </Link>
    ) : (
      <>
        <Link to="/login" className={styles.navLink}>
          {STUDENT_NAV.login}
        </Link>
        <Link
          to="/discover"
          search={{ city: DEFAULT_CITY_ID, category: "dance" }}
        >
          <Button variant="primary">{STUDENT_NAV.findStudio}</Button>
        </Link>
      </>
    ));

  const marketingActions =
    !loading &&
    (appHome ? (
      <Link to={appHome}>
        <Button variant="primary">Open app</Button>
      </Link>
    ) : (
      <>
        <Link to="/login" className={styles.navLink}>
          {NAV.login}
        </Link>
        <Link to="/register" search={{ for: "studio" }}>
          <Button variant="primary">{NAV.start}</Button>
        </Link>
      </>
    ));

  const shell = (
    <div className={shellClass}>
      {isLanding ? (
        <a href="#main-content" className={styles.skip}>
          Skip to content
        </a>
      ) : null}

      {isStudent ? (
        <header className={styles.studentHeader}>
          <div className={styles.studentHeaderInner}>
            <Link to="/" className={styles.brand} onClick={closeMenu}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                width={32}
                height={32}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="mono" />
            </Link>
            <CitySwitcher />
            <nav className={styles.desktopNav} aria-label="Primary">
              {hashLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={styles.navLink}
                  aria-current={activeHref === link.href ? "true" : undefined}
                >
                  {link.label}
                </a>
              ))}
              {routeLinks.map((link) => (
                <Link key={link.to} to={link.to} className={styles.navLink}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className={styles.desktopActions}>
              <ThemeSwitcher />
              {studentActions}
            </div>
            <div className={styles.mobileHeaderActions}>
              <ThemeSwitcher />
              <Link
                to="/discover"
                search={{ city: DEFAULT_CITY_ID, category: "dance" }}
                className={styles.iconButton}
                aria-label="Search classes"
              >
                <SearchIcon className={styles.iconSvg} />
              </Link>
              <button
                ref={toggleRef}
                type="button"
                className={styles.menuToggle}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span
                  className={styles.menuBar}
                  data-open={menuOpen || undefined}
                />
                <span
                  className={styles.menuBar}
                  data-open={menuOpen || undefined}
                />
              </button>
            </div>
          </div>
        </header>
      ) : isMarketing ? (
        <header className={styles.islandWrap}>
          <div className={styles.island}>
            <Link
              to="/for-studios"
              className={styles.brand}
              onClick={closeMenu}
            >
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                width={32}
                height={32}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="mono" />
            </Link>
            <nav className={styles.desktopNav} aria-label="Primary">
              {hashLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={styles.navLink}
                  aria-current={activeHref === link.href ? "true" : undefined}
                >
                  {link.label}
                </a>
              ))}
              {routeLinks.map((link) => (
                <Link key={link.to} to={link.to} className={styles.navLink}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className={styles.desktopActions}>
              <ThemeSwitcher />
              {marketingActions}
            </div>
            <ThemeSwitcher className={styles.islandTheme} />
            <button
              ref={toggleRef}
              type="button"
              className={styles.menuToggle}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span
                className={styles.menuBar}
                data-open={menuOpen || undefined}
              />
              <span
                className={styles.menuBar}
                data-open={menuOpen || undefined}
              />
            </button>
          </div>
        </header>
      ) : (
        <header className={styles.header}>
          <Link to="/" className={styles.brand}>
            <img
              className={styles.brandIcon}
              src={BRAND_ICON_SRC}
              width={32}
              height={32}
              alt=""
              aria-hidden
            />
            <ClassaWordmark variant="italic-a" />
          </Link>
          <nav className={styles.nav}>
            <ThemeSwitcher />
            {!loading &&
              (appHome ? (
                <Link to={appHome}>
                  <Button variant="primary">Open app</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="primary">Sign in</Button>
                </Link>
              ))}
          </nav>
        </header>
      )}

      {isLanding && menuOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          className={[
            styles.mobilePanel,
            isStudent ? styles.mobilePanelStudent : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <nav className={styles.mobileNav} aria-label="Primary">
            {hashLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                style={{ animationDelay: `${100 + i * 50}ms` }}
                aria-current={activeHref === link.href ? "true" : undefined}
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
            {routeLinks.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                className={styles.mobileLink}
                style={{
                  animationDelay: `${100 + (hashLinks.length + i) * 50}ms`,
                }}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.mobileActions}>
            <ThemeSwitcher variant="segmented" />
            {!loading &&
              (appHome ? (
                <TouchButton
                  as={Link}
                  to={appHome}
                  variant="primary"
                  fullWidth
                  onClick={closeMenu}
                >
                  Open app
                </TouchButton>
              ) : isStudent ? (
                <>
                  <TouchButton
                    as={Link}
                    to="/login"
                    variant="default"
                    fullWidth
                    onClick={closeMenu}
                  >
                    {STUDENT_NAV.login}
                  </TouchButton>
                  <TouchButton
                    as={Link}
                    to="/discover"
                    search={{ city: "chennai", category: "dance" } as never}
                    variant="primary"
                    fullWidth
                    onClick={closeMenu}
                  >
                    {STUDENT_NAV.findStudio}
                  </TouchButton>
                </>
              ) : (
                <>
                  <TouchButton
                    as={Link}
                    to="/login"
                    variant="default"
                    fullWidth
                    onClick={closeMenu}
                  >
                    {NAV.login}
                  </TouchButton>
                  <TouchButton
                    as={Link}
                    to="/register"
                    search={{ for: "studio" } as never}
                    variant="primary"
                    fullWidth
                    onClick={closeMenu}
                  >
                    {NAV.start}
                  </TouchButton>
                </>
              ))}
          </div>
        </div>
      ) : null}

      <main id="main-content" className={mainClass} tabIndex={-1}>
        {children}
      </main>

      {isStudentHome ? (
        <footer className={styles.footerMarketing}>
          <div className={styles.footerInnerWide}>
            <div className={styles.footerBrand}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                width={32}
                height={32}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="italic-a" />
              <p className={styles.footerTagline}>{STUDENT_FOOTER.tagline}</p>
            </div>
            <div className={styles.footerColumns}>
              <div>
                <p className={styles.footerColTitle}>
                  {STUDENT_FOOTER.forStudents}
                </p>
                <nav
                  className={styles.footerColLinks}
                  aria-label="For students"
                >
                  <Link
                    to="/discover"
                    search={{ city: DEFAULT_CITY_ID, category: "dance" }}
                  >
                    {STUDENT_FOOTER.discoverStudios}
                  </Link>
                  <Link
                    to="/discover"
                    search={{ city: DEFAULT_CITY_ID, category: "dance" }}
                  >
                    {STUDENT_FOOTER.findClasses}
                  </Link>
                  <a href="#how-it-works">{STUDENT_FOOTER.howItWorks}</a>
                  <StudentFooterFacets />
                </nav>
              </div>
              <div>
                <p className={styles.footerColTitle}>
                  {STUDENT_FOOTER.forStudios}
                </p>
                <nav className={styles.footerColLinks} aria-label="For studios">
                  <Link to="/for-studios">{STUDENT_FOOTER.joinAsStudio}</Link>
                  <Link to="/login">{STUDENT_FOOTER.studioLogin}</Link>
                  <a href="/for-studios#features">{STUDENT_FOOTER.features}</a>
                </nav>
              </div>
              <div>
                <p className={styles.footerColTitle}>
                  {STUDENT_FOOTER.company}
                </p>
                <nav className={styles.footerColLinks} aria-label="Company">
                  <a href="#faq">{STUDENT_FOOTER.about}</a>
                  <Link to="/register" search={{ for: "studio" }}>
                    {STUDENT_FOOTER.contact}
                  </Link>
                  <Link to="/privacy">{STUDENT_FOOTER.privacy}</Link>
                  <Link to="/terms">{STUDENT_FOOTER.terms}</Link>
                </nav>
              </div>
            </div>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} {STUDENT_FOOTER.copyright}
            </p>
          </div>
        </footer>
      ) : isStudent ? (
        <footer
          className={[styles.footerCompact, dock ? styles.footerDock : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.footerCompactInner}>
            <Link to="/" className={styles.footerBrand}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                width={24}
                height={24}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="italic-a" />
            </Link>
            <div className={styles.footerCompactMeta}>
              <nav className={styles.footerCompactLinks} aria-label="Footer">
                <Link to="/privacy">{STUDENT_FOOTER.privacy}</Link>
                <Link to="/terms">{STUDENT_FOOTER.terms}</Link>
              </nav>
              <p className={styles.footerCopy}>
                © {new Date().getFullYear()} {STUDENT_FOOTER.copyright}
              </p>
            </div>
          </div>
        </footer>
      ) : isMarketing ? (
        <footer className={styles.footerMarketing}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                width={32}
                height={32}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="italic-a" />
              <p className={styles.footerTagline}>{FOOTER.tagline}</p>
            </div>
            <nav className={styles.footerLinks} aria-label="Footer">
              {NAV.links.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              <Link to="/">{STUDIO_NAV_EXTRA.forStudents}</Link>
              <Link to="/login">{NAV.login}</Link>
              <Link to="/privacy">{FOOTER.privacy}</Link>
              <Link to="/terms">{FOOTER.terms}</Link>
            </nav>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} {FOOTER.copyright}
            </p>
          </div>
        </footer>
      ) : (
        <footer className={styles.footer}>
          classa Dance Studio — move with confidence.
        </footer>
      )}
    </div>
  );

  if (isStudent) {
    return <DiscoverCityProvider>{shell}</DiscoverCityProvider>;
  }
  return shell;
}

function StudentFooterFacets() {
  const landing = useDiscoverLanding();
  const styles = landing.data?.styles.slice(0, 6) ?? [];
  const areas = (landing.data?.areas ?? [])
    .filter((area) => area.popular)
    .slice(0, 6);
  if (styles.length === 0 && areas.length === 0) return null;
  return (
    <>
      {styles.map((style) => (
        <Link
          key={style.id}
          to="/discover"
          search={{
            city: DEFAULT_CITY_ID,
            category: "dance",
            style: style.id,
          }}
        >
          {style.label}
        </Link>
      ))}
      {areas.map((area) => (
        <Link
          key={area.id}
          to="/discover"
          search={{
            city: DEFAULT_CITY_ID,
            category: "dance",
            locality: area.id,
          }}
        >
          {area.label}
        </Link>
      ))}
    </>
  );
}

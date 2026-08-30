import { Button } from "@dev-ui/components/button";
import { Link } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import { BRAND_ICON_SRC } from "@/lib/brand";
import { ClassaWordmark } from "@/modules/branding/classa-wordmark";
import { SEED_STUDIO_ID } from "@/lib/constants";
import { homePathForUser } from "@/lib/require-auth";
import { useDismissBootPublic } from "@/lib/use-dismiss-boot-public";
import { FOOTER, NAV } from "@/modules/marketing/content";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./public-shell.module.scss";

type PublicShellProps = {
  children: ReactNode;
  /** Login keeps the static shell until first input for LCP; others idle-dismiss. */
  bootDismiss?: "idle" | "interact";
  /** `marketing` adds full landing nav; `minimal` keeps Studio + Sign in. */
  nav?: "minimal" | "marketing";
  /** `full` removes main max-width clamp for edge-to-edge sections. */
  width?: "prose" | "full";
};

export function PublicShell({
  children,
  bootDismiss = "idle",
  nav = "minimal",
  width = "prose",
}: PublicShellProps) {
  useDismissBootPublic(bootDismiss);
  const { user, loading } = useAuth();
  const appHome = user ? homePathForUser(user) : null;
  const isMarketing = nav === "marketing";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

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
    if (!isMarketing) return;

    let observer: IntersectionObserver | null = null;

    const connect = () => {
      const els = NAV.links
        .map((link) => document.getElementById(link.href.slice(1)))
        .filter((el): el is HTMLElement => Boolean(el));
      if (els.length !== NAV.links.length) return false;

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
  }, [isMarketing]);

  const shellClass = [styles.shell, isMarketing ? styles.shellMarketing : ""]
    .filter(Boolean)
    .join(" ");

  const mainClass = [styles.main, width === "full" ? styles.mainFull : ""]
    .filter(Boolean)
    .join(" ");

  const authActions =
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
        <Link to="/register">
          <Button variant="primary">{NAV.start}</Button>
        </Link>
      </>
    ));

  return (
    <div className={shellClass}>
      {isMarketing ? (
        <a href="#main-content" className={styles.skip}>
          Skip to content
        </a>
      ) : null}

      {isMarketing ? (
        <header className={styles.islandWrap}>
          <div className={styles.island}>
            <Link to="/" className={styles.brand} onClick={closeMenu}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
                alt=""
                aria-hidden
              />
              <ClassaWordmark variant="mono" />
            </Link>
            <nav className={styles.desktopNav} aria-label="Primary">
              {NAV.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={styles.navLink}
                  aria-current={activeHref === link.href ? "true" : undefined}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className={styles.desktopActions}>{authActions}</div>
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
              alt=""
              aria-hidden
            />
            <ClassaWordmark variant="italic-a" />
          </Link>
          <nav className={styles.nav}>
            <Link to="/studio/$studioId" params={{ studioId: SEED_STUDIO_ID }}>
              <Button variant="quiet">Studio</Button>
            </Link>
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

      {isMarketing && menuOpen ? (
        <div
          ref={menuRef}
          id={menuId}
          className={styles.mobilePanel}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <nav className={styles.mobileNav} aria-label="Primary">
            {NAV.links.map((link, i) => (
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
          </nav>
          <div className={styles.mobileActions}>
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

      <footer className={isMarketing ? styles.footerMarketing : styles.footer}>
        {isMarketing ? (
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <img
                className={styles.brandIcon}
                src={BRAND_ICON_SRC}
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
              <Link to="/login">{NAV.login}</Link>
              <Link to="/privacy">{FOOTER.privacy}</Link>
              <Link to="/terms">{FOOTER.terms}</Link>
            </nav>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} {FOOTER.copyright}
            </p>
          </div>
        ) : (
          "classa Dance Studio — move with confidence."
        )}
      </footer>
    </div>
  );
}

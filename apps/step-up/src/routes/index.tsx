import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { homePathForUser } from "@/lib/require-auth";
import { PublicShell } from "@/modules/layout/public-shell";
import { Hero } from "@/modules/marketing/hero";
import styles from "./index.module.scss";

const LandingSections = lazy(() => import("@/modules/marketing/sections"));

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    const user = context.auth.user;
    if (user) {
      throw redirect({ to: homePathForUser(user), replace: true });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const [showSections, setShowSections] = useState(false);

  useEffect(() => {
    const enable = () => setShowSections(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(enable, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = window.setTimeout(enable, 800);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <PublicShell nav="marketing" width="full">
      <div className={styles.page}>
        <Hero />
        {showSections ? (
          <Suspense fallback={null}>
            <LandingSections />
          </Suspense>
        ) : null}
      </div>
    </PublicShell>
  );
}

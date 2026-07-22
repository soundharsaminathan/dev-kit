import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/modules/layout/public-shell";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./index.module.scss";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <PublicShell>
      <section className={styles.hero}>
        <h1 className={styles.brand}>Step Up</h1>
        <p className={styles.headline}>
          Dance studio operations, beautifully simple.
        </p>
        <p className={styles.support}>
          Run batches, plans, attendance, and bookings from one calm workspace —
          or step into class as a student or parent.
        </p>
        <div className={styles.actions}>
          <TouchButton as={Link} to="/register" variant="primary" fullWidth>
            Join as a student
          </TouchButton>
          <TouchButton as={Link} to="/login" variant="default" fullWidth>
            Sign in
          </TouchButton>
          <TouchButton as={Link} to="/studio" variant="quiet" fullWidth>
            Explore the studio
          </TouchButton>
        </div>
      </section>
    </PublicShell>
  );
}

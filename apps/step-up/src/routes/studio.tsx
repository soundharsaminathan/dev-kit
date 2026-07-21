import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublic } from "@/lib/api";
import { STUDIO_ID } from "@/lib/constants";
import { PublicShell } from "@/modules/layout/public-shell";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./studio.module.scss";

type StudioProfile = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  photos: string[];
};

export const Route = createFileRoute("/studio")({
  component: StudioPage,
});

function StudioPage() {
  const query = useQuery({
    queryKey: ["studio-public", STUDIO_ID],
    queryFn: () => getPublic<StudioProfile>(`/studios/${STUDIO_ID}/public`),
  });

  return (
    <PublicShell>
      <section className={styles.page}>
        <Badge>Public studio</Badge>
        {query.isLoading ? (
          <>
            <SkeletonBlock height="2rem" width="60%" />
            <SkeletonBlock height="6rem" />
          </>
        ) : null}
        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load studio."
            }
          />
        ) : null}
        {query.data ? (
          <>
            <h1 className={styles.title}>{query.data.name}</h1>
            <p className={styles.lead}>
              Train with confidence. Book a trial, join a batch, or visit us in
              person.
            </p>
            {query.data.address || query.data.contact ? (
              <div className={styles.card}>
                {query.data.address ? (
                  <>
                    <p className={styles.label}>Address</p>
                    <p>{query.data.address}</p>
                  </>
                ) : null}
                {query.data.contact ? (
                  <>
                    <p className={styles.label}>Contact</p>
                    <p>{query.data.contact}</p>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className={styles.actions}>
              <TouchButton variant="primary" fullWidth>
                <Link to="/login">Sign in to book</Link>
              </TouchButton>
              <TouchButton variant="quiet" fullWidth>
                <Link to="/">Back home</Link>
              </TouchButton>
            </div>
          </>
        ) : null}
        {!query.isLoading && !query.isError && !query.data ? (
          <EmptyState title="Studio not found" />
        ) : null}
      </section>
    </PublicShell>
  );
}

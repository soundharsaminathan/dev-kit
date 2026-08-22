import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { formatSessionRange } from "@/modules/batches/batch-overview-helpers";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./incomplete.module.scss";

type IncompletePastSession = {
  id: string;
  batchId: string;
  batchName: string;
  startsAt: string;
  endsAt: string;
  firstTrainer: { id: string; name: string } | null;
};

export const Route = createFileRoute("/app/sessions/incomplete")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: IncompleteSessionsPage,
});

function IncompleteSessionsPage() {
  const api = useApi();
  const studioId = useStudioId();

  const incompletePast = useQuery({
    queryKey: ["sessions", "incomplete-past", studioId],
    queryFn: () =>
      api.get<IncompletePastSession[]>(
        `/sessions/studio/${studioId}/incomplete-past`,
      ),
    enabled: Boolean(studioId),
    staleTime: 30_000,
  });

  const count = incompletePast.data?.length ?? 0;

  return (
    <Screen
      title="Incomplete sessions"
      subtitle={
        count === 1
          ? "1 past session still needs completion"
          : count > 1
            ? `${count} past sessions still need completion`
            : "Past sessions that ended without attendance"
      }
      showBack
      backTo="/app"
    >
      <PullToRefresh onRefresh={() => incompletePast.refetch()}>
        <div className={staff.section}>
          {incompletePast.isLoading ? <SkeletonRowList count={4} /> : null}

          {incompletePast.isError ? (
            <ErrorState
              description={
                incompletePast.error instanceof Error
                  ? incompletePast.error.message
                  : "Could not load incomplete sessions."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => incompletePast.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {incompletePast.data && count === 0 ? (
            <EmptyState
              title="All caught up"
              description="No past sessions are waiting for completion."
            />
          ) : null}

          {count > 0 ? (
            <ul
              className={styles.list}
              aria-label="Incomplete sessions"
              data-testid="incomplete-sessions-list"
            >
              {incompletePast.data?.map((session) => {
                const metaParts = [
                  session.batchName,
                  session.firstTrainer?.name,
                ].filter(Boolean);

                return (
                  <li key={session.id}>
                    <Link
                      to="/app/sessions/$id/attendance"
                      params={{ id: session.id }}
                      className={styles.row}
                      data-testid={`incomplete-session-${session.id}`}
                    >
                      <div className={styles.copy}>
                        <span className={styles.when}>
                          {formatSessionRange(
                            session.startsAt,
                            session.endsAt,
                          )}
                        </span>
                        <span className={styles.meta}>
                          {metaParts.join(" · ")}
                        </span>
                        <span className={styles.action}>
                          Complete attendance
                        </span>
                      </div>
                      <Icon name="chevron-right" className={styles.chevron} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

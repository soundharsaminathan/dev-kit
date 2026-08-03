import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { describeLegacyOrDocument } from "@/modules/certificates/migrate-layout";
import type { CertificateTemplate } from "@/modules/certificates/types";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/app/certificates/")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: CertificateTemplatesPage,
});

function CertificateTemplatesPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["certificate-templates", studioId],
    queryFn: () =>
      api.get<CertificateTemplate[]>(
        `/certificate-templates/studio/${studioId}`,
      ),
  });

  return (
    <Screen
      title="Certificates"
      subtitle="Templates used for batch completion and contest awards."
      actions={
        <TouchButton variant="primary" size="md">
          <Link to="/app/certificates/new">Add</Link>
        </TouchButton>
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          {query.isLoading ? <SkeletonCardList count={3} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load certificate templates."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length === 0 ? (
            <EmptyState
              title="No templates yet"
              description="Create a certificate template for batches and contests."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/certificates/new">Add template</Link>
                </TouchButton>
              }
            />
          ) : null}

          {query.data && query.data.length > 0 ? (
            <div className={staff.list}>
              {query.data.map((template) => (
                <PressableCard
                  key={template.id}
                  onClick={() =>
                    void navigate({
                      to: "/app/certificates/$id",
                      params: { id: template.id },
                    })
                  }
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>{template.name}</span>
                      {template.isSample ? (
                        <span className={staff.rowMeta}>Sample</span>
                      ) : null}
                    </div>
                    <p className={staff.rowMeta}>
                      {describeLegacyOrDocument(template.layoutJson)}
                    </p>
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

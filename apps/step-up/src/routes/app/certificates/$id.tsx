import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { CertificateDesigner } from "@/modules/certificates/designer/certificate-designer";
import { isCertificateDocumentValid } from "@/modules/certificates/designer/document-valid";
import { ensureCertificateDocument } from "@/modules/certificates/migrate-layout";
import type {
  CertificateDocument,
  CertificateTemplate,
} from "@/modules/certificates/types";
import { ApiState } from "@/modules/ui/api-state";
import styles from "./edit.module.scss";

export const Route = createFileRoute("/app/certificates/$id")({
  component: EditCertificateTemplatePage,
});

function EditCertificateTemplatePage() {
  const { id } = Route.useParams();
  const api = useApi();

  const query = useQuery({
    queryKey: ["certificate-template", id],
    queryFn: () => api.get<CertificateTemplate>(`/certificate-templates/${id}`),
  });

  return (
    <section className={`page ${styles.page}`}>
      <ApiState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        emptyTitle="Template not found"
        emptyDescription="This certificate template is unavailable."
      >
        {(template) => <EditCertificateTemplateForm template={template} />}
      </ApiState>
    </section>
  );
}

function EditCertificateTemplateForm({
  template,
}: {
  template: CertificateTemplate;
}) {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const initial = ensureCertificateDocument(template.layoutJson);
  const [name, setName] = useState(template.name);
  const [layout, setLayout] = useState<CertificateDocument>(initial);

  const onDocumentChange = useCallback((doc: CertificateDocument) => {
    setLayout(doc);
  }, []);

  const autosave = useCallback(
    async (payload: { name: string; layoutJson: CertificateDocument }) => {
      await api.patch<CertificateTemplate>(
        `/certificate-templates/${template.id}`,
        {
          name: payload.name,
          layoutJson: payload.layoutJson,
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["certificate-templates", STUDIO_ID],
        }),
        queryClient.invalidateQueries({
          queryKey: ["certificate-template", template.id],
        }),
      ]);
    },
    [api, queryClient, template.id],
  );

  const deleteTemplate = useMutation({
    mutationFn: () => api.delete(`/certificate-templates/${template.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["certificate-templates", STUDIO_ID],
      });
      await navigate({ to: "/app/certificates" });
    },
  });

  const canKeep = name.trim().length > 0 && isCertificateDocumentValid(layout);

  return (
    <div className={styles.shell}>
      <div className={styles.chrome}>
        <Button as={Link} to="/app/certificates" variant="quiet" size="sm">
          Back
        </Button>
        <div className={styles.chromeActions}>
          {!template.isSample ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteTemplate.mutate()}
              isPending={deleteTemplate.isPending}
            >
              Delete
            </Button>
          ) : null}
          <Button as={Link} to="/app/certificates" variant="primary" size="sm">
            Done
          </Button>
        </div>
      </div>

      {deleteTemplate.isError ? (
        <p role="alert">{(deleteTemplate.error as Error).message}</p>
      ) : null}

      <CertificateDesigner
        name={name}
        onNameChange={setName}
        document={initial}
        onDocumentChange={onDocumentChange}
        autosave={autosave}
        autosaveEnabled={canKeep}
        compactChrome
      />
    </div>
  );
}

import { Button } from "@dev-ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import {
  CertificateDesigner,
  isCertificateDocumentValid,
} from "@/modules/certificates/designer/certificate-designer";
import {
  type CertificateDocument,
  type CertificateTemplate,
  createDefaultCertificateDocument,
} from "@/modules/certificates/types";
import { PageHeader } from "@/modules/ui/page-header";

export const Route = createFileRoute("/app/certificates/new")({
  component: NewCertificateTemplatePage,
});

function NewCertificateTemplatePage() {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [layout, setLayout] = useState<CertificateDocument>(
    createDefaultCertificateDocument,
  );

  const onDocumentChange = useCallback((doc: CertificateDocument) => {
    setLayout(doc);
  }, []);

  const createTemplate = useMutation({
    mutationFn: () =>
      api.post<CertificateTemplate>("/certificate-templates", {
        studioId: STUDIO_ID,
        name,
        layoutJson: layout,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["certificate-templates", STUDIO_ID],
      });
      await navigate({ to: "/app/certificates" });
    },
  });

  const canSubmit =
    name.trim().length > 0 && isCertificateDocumentValid(layout);

  return (
    <section className="page stack">
      <PageHeader
        title="New certificate template"
        description="Design a reusable certificate for batches and contests."
        actions={
          <Button as={Link} to="/app/certificates" variant="quiet">
            Cancel
          </Button>
        }
      />

      <CertificateDesigner
        name={name}
        onNameChange={setName}
        document={layout}
        onDocumentChange={onDocumentChange}
      />

      {createTemplate.isError ? (
        <p role="alert">{(createTemplate.error as Error).message}</p>
      ) : null}

      <Button
        variant="primary"
        onClick={() => createTemplate.mutate()}
        isPending={createTemplate.isPending}
        isDisabled={!canSubmit}
      >
        Create template
      </Button>
    </section>
  );
}

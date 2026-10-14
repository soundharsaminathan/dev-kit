import { Button } from "@dev-ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dev-ui/components/card";
import { Empty, EmptyDescription } from "@dev-ui/components/empty";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ChoiceControl, FileControl, FormError } from "@/modules/ui/controls";

type DocumentRow = {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  createdAt?: string;
};

type SignedUrlResponse = {
  uploadUrl: string;
  key: string;
  provider: string;
};

type DocumentsPanelProps = {
  entityType: "CUSTOMER" | "LOAN";
  entityId: string;
  title?: string;
};

export function DocumentsPanel({
  entityType,
  entityId,
  title = "Documents",
}: DocumentsPanelProps) {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("OTHER");
  const [file, setFile] = useState<File | null>(null);

  const docs = useQuery({
    queryKey: ["documents", entityType, entityId],
    queryFn: () =>
      api.get<DocumentRow[]>(
        `/documents?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      ),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["documents", entityType, entityId],
    });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file");
      const contentType = file.type || "application/octet-stream";
      const signed = await api.post<SignedUrlResponse>(
        "/documents/signed-url",
        {
          fileName: file.name,
          contentType,
        },
      );
      if (signed.provider !== "dev-stub") {
        const put = await fetch(signed.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": contentType },
        });
        if (!put.ok) {
          throw new Error("Upload to storage failed");
        }
      }
      await api.post("/documents", {
        entityType,
        entityId,
        kind,
        objectKey: signed.key,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
    },
    onSuccess: async () => {
      setError(null);
      setFile(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
      {docs.isLoading ? <Skeleton /> : null}
      {docs.isError ? (
        <FormError>
          {`Documents unavailable (${(docs.error as Error).message})`}
        </FormError>
      ) : null}
      {docs.data && docs.data.length > 0 ? (
        <Table<DocumentRow> aria-label={title} items={docs.data}>
          <TableHeader>
            <TableColumn id="kind" isRowHeader>
              Kind
            </TableColumn>
            <TableColumn id="file">File</TableColumn>
            <TableColumn id="uploaded">Uploaded</TableColumn>
          </TableHeader>
          <TableBody<DocumentRow>>
            {(doc) => (
              <TableRow>
                {(column) => (
                  <TableCell>
                    {column.id === "kind" ? doc.kind : null}
                    {column.id === "file" ? doc.fileName : null}
                    {column.id === "uploaded"
                      ? doc.createdAt
                        ? new Date(doc.createdAt).toLocaleString()
                        : "—"
                      : null}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : docs.isSuccess ? (
        <Empty>
          <EmptyDescription>No documents yet.</EmptyDescription>
        </Empty>
      ) : null}

      <form
        className="lm-form"
        style={{ marginTop: "1rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <ChoiceControl
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { id: "KYC_PHOTO_ID", label: "KYC photo ID" },
            { id: "KYC_PAN", label: "KYC PAN" },
            { id: "KYC_ADDRESS", label: "KYC address" },
            { id: "LOAN_AGREEMENT", label: "Loan agreement" },
            { id: "LOAN_SANCTION", label: "Loan sanction" },
            { id: "OTHER", label: "Other" },
          ]}
        />
        <FileControl
          label="File"
          fileName={file?.name}
          onSelect={setFile}
        />
        {error ? <FormError>{error}</FormError> : null}
        <Button
          type="submit"
          variant="outline"
          isDisabled={upload.isPending || !file}
        >
          Upload
        </Button>
      </form>
      </CardContent>
    </Card>
  );
}

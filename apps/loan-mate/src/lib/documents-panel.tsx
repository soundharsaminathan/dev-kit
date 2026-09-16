import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

type DocumentRow = {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  createdAt?: string;
};

type SignedUrlResponse = {
  uploadUrl: string;
  objectKey: string;
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
      const signed = await api.post<SignedUrlResponse>(
        "/documents/signed-url",
        {
          entityType,
          entityId,
          kind,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        },
      );
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!put.ok) {
        throw new Error("Upload to storage failed");
      }
      await api.post("/documents", {
        entityType,
        entityId,
        kind,
        objectKey: signed.objectKey,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
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
    <div className="lm-card">
      <h2>{title}</h2>
      {docs.isLoading ? <p>Loading…</p> : null}
      {docs.isError ? (
        <p className="lm-muted">
          Documents unavailable ({(docs.error as Error).message})
        </p>
      ) : null}
      {docs.data?.length ? (
        <table className="lm-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>File</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {docs.data.map((d) => (
              <tr key={d.id}>
                <td>{d.kind}</td>
                <td>{d.fileName}</td>
                <td>
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : docs.isSuccess ? (
        <p className="lm-muted">No documents yet.</p>
      ) : null}

      <form
        className="lm-form"
        style={{ marginTop: "1rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <div className="lm-form-row">
          <label htmlFor={`doc-kind-${entityId}`}>Kind</label>
          <select
            id={`doc-kind-${entityId}`}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="KYC_PHOTO_ID">KYC photo ID</option>
            <option value="KYC_PAN">KYC PAN</option>
            <option value="KYC_ADDRESS">KYC address</option>
            <option value="LOAN_AGREEMENT">Loan agreement</option>
            <option value="LOAN_SANCTION">Loan sanction</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="lm-form-row">
          <label htmlFor={`doc-file-${entityId}`}>File</label>
          <input
            id={`doc-file-${entityId}`}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {error ? <p className="lm-error">{error}</p> : null}
        <button
          type="submit"
          className="lm-btn lm-btn-secondary"
          disabled={upload.isPending || !file}
        >
          Upload
        </button>
      </form>
    </div>
  );
}

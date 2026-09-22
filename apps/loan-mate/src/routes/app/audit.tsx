import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { downloadAuthed } from "@/lib/download";
import { FormError, FormInput } from "@/modules/ui/form-fields";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  reason?: string | null;
  createdAt: string;
};

export const Route = createFileRoute("/app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { api, token } = useAuth();
  const [filters, setFilters] = useState({ action: "", entityType: "" });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const queryString = new URLSearchParams();
  if (filters.action.trim()) queryString.set("action", filters.action.trim());
  if (filters.entityType.trim()) {
    queryString.set("entityType", filters.entityType.trim());
  }
  const qs = queryString.toString();

  const logs = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api.get<AuditRow[]>(`/audit${qs ? `?${qs}` : ""}`),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Audit log</h1>
          <p>Append-only company activity.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          isDisabled={!token}
          onClick={() => {
            if (!token) return;
            setDownloadError(null);
            const exportQs = new URLSearchParams(queryString);
            exportQs.set("format", "csv");
            downloadAuthed(
              `/audit/export?${exportQs.toString()}`,
              token,
              "audit-export.csv",
            ).catch((err) => {
              setDownloadError(
                err instanceof Error ? err.message : "Export failed",
              );
            });
          }}
        >
          <Icon name="download" />
          Download CSV
        </Button>
      </div>

      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            void logs.refetch();
          }}
        >
          <FormInput
            label="Action"
            placeholder="e.g. loan.disburse"
            value={filters.action}
            onChange={(action) => setFilters((f) => ({ ...f, action }))}
          />
          <FormInput
            label="Entity type"
            placeholder="e.g. Loan"
            value={filters.entityType}
            onChange={(entityType) => setFilters((f) => ({ ...f, entityType }))}
          />
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
        {downloadError ? <FormError>{downloadError}</FormError> : null}
      </div>

      <div className="lm-card lm-table-wrap">
        {logs.isLoading ? <p>Loading…</p> : null}
        {logs.isError ? (
          <FormError>{(logs.error as Error).message}</FormError>
        ) : null}
        {logs.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.entityType} · {row.entityId}
                  </td>
                  <td>{row.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

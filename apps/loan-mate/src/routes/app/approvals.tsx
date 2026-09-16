import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatApprovalPayload } from "@/lib/approval-summary";
import { useAuth } from "@/lib/auth";

type Approval = {
  id: string;
  type?: string;
  status: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  createdAt?: string;
  maker?: { id: string; name: string; email: string };
  payload?: Record<string, unknown> | null;
};

export const Route = createFileRoute("/app/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const approvals = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.get<Approval[]>("/approvals"),
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      rejectionReason,
    }: {
      id: string;
      decision: "approve" | "reject";
      rejectionReason?: string;
    }) =>
      api.post(`/approvals/${id}/${decision}`, {
        reason: rejectionReason,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Action failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Approvals</h1>
          <p>Single-level maker-checker — maker cannot approve own request.</p>
        </div>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}

      <div className="lm-card lm-table-wrap">
        {approvals.isLoading ? <p>Loading…</p> : null}
        {approvals.isError ? (
          <p className="lm-error">{(approvals.error as Error).message}</p>
        ) : null}
        {approvals.data?.length === 0 ? (
          <p className="lm-muted">No pending approvals.</p>
        ) : null}
        {approvals.data && approvals.data.length > 0 ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Summary</th>
                <th>Requested by</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="lm-badge">
                      {a.type ?? a.entityType ?? "—"}
                    </span>
                  </td>
                  <td>
                    {formatApprovalPayload(
                      a.payload as Record<string, unknown> | undefined,
                    )}
                    {a.reason ? ` — ${a.reason}` : ""}
                  </td>
                  <td>{a.maker?.name ?? "—"}</td>
                  <td>
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                  </td>
                  <td>
                    <div className="lm-actions">
                      <button
                        type="button"
                        className="lm-btn"
                        disabled={decide.isPending}
                        onClick={() =>
                          decide.mutate({ id: a.id, decision: "approve" })
                        }
                      >
                        Approve
                      </button>
                      <input
                        placeholder="Reject reason"
                        value={reason[a.id] ?? ""}
                        onChange={(e) =>
                          setReason((r) => ({ ...r, [a.id]: e.target.value }))
                        }
                        style={{ minWidth: "8rem", padding: "0.4rem 0.5rem" }}
                      />
                      <button
                        type="button"
                        className="lm-btn lm-btn-danger"
                        disabled={decide.isPending}
                        onClick={() => {
                          const rejectionReason = reason[a.id]?.trim();
                          decide.mutate({
                            id: a.id,
                            decision: "reject",
                            ...(rejectionReason ? { rejectionReason } : {}),
                          });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

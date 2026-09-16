import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { DocumentsPanel } from "@/lib/documents-panel";

type Customer = {
  id: string;
  customerNumber?: string;
  name: string;
  mobile: string;
  pan?: string;
  address?: string;
  branchId?: string;
  blacklistReason?: string | null;
  blacklisted?: boolean;
  npa?: boolean;
  npaReason?: string | null;
};

type Loan = {
  id: string;
  loanNumber?: string;
  status: string;
  principal?: number;
};

export const Route = createFileRoute("/app/customers/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    pan: "",
    address: "",
  });
  const [blacklistReason, setBlacklistReason] = useState("");
  const [npaReason, setNpaReason] = useState("");
  const [npaClearReason, setNpaClearReason] = useState("");

  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
  });

  const loans = useQuery({
    queryKey: ["loans", { customerId: id }],
    queryFn: () => api.get<Loan[]>(`/loans?customerId=${id}`),
  });

  useEffect(() => {
    if (!customer.data) return;
    setEditForm({
      name: customer.data.name,
      mobile: customer.data.mobile,
      pan: customer.data.pan ?? "",
      address: customer.data.address ?? "",
    });
  }, [customer.data]);

  const invalidate = async () => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ["customers", id] });
  };

  const onErr = (err: unknown) => {
    setSuccess(null);
    setError(err instanceof Error ? err.message : "Action failed");
  };

  const saveCustomer = useMutation({
    mutationFn: () => api.patch(`/customers/${id}`, editForm),
    onSuccess: async () => {
      setSuccess("Customer updated.");
      setEditOpen(false);
      await invalidate();
    },
    onError: onErr,
  });

  const blacklist = useMutation({
    mutationFn: (blacklisted: boolean) =>
      api.post(`/customers/${id}/blacklist`, {
        blacklisted,
        reason: blacklistReason.trim() || undefined,
      }),
    onSuccess: async (_data, blacklisted) => {
      setSuccess(blacklisted ? "Blacklisted." : "Removed from blacklist.");
      setBlacklistReason("");
      await invalidate();
    },
    onError: onErr,
  });

  const requestNpaMark = useMutation({
    mutationFn: () =>
      api.post(`/customers/${id}/request-npa-mark`, {
        reason: npaReason.trim(),
      }),
    onSuccess: async () => {
      setSuccess("NPA mark submitted for approval.");
      setNpaReason("");
      await invalidate();
    },
    onError: onErr,
  });

  const requestNpaClear = useMutation({
    mutationFn: () =>
      api.post(`/customers/${id}/request-npa-clear`, {
        reason: npaClearReason.trim() || undefined,
      }),
    onSuccess: async () => {
      setSuccess("NPA clear submitted for approval.");
      setNpaClearReason("");
      await invalidate();
    },
    onError: onErr,
  });

  if (customer.isLoading) return <p>Loading…</p>;
  if (customer.isError || !customer.data) {
    return (
      <p className="lm-error">
        {(customer.error as Error)?.message ?? "Customer not found"}
      </p>
    );
  }

  const c = customer.data;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.customerNumber ?? c.id} · {c.mobile}
          </p>
          <div className="lm-actions" style={{ marginTop: "0.5rem" }}>
            {c.blacklisted ? (
              <span className="lm-badge">Blacklisted</span>
            ) : null}
            {c.npa ? <span className="lm-badge">NPA</span> : null}
          </div>
        </div>
        <Link
          to="/app/loans/new"
          search={{ customerId: c.id }}
          className="lm-btn"
        >
          New loan
        </Link>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}
      {success ? <p style={{ color: "var(--lm-success)" }}>{success}</p> : null}

      <div className="lm-card">
        <div className="lm-page-header" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <button
            type="button"
            className="lm-btn lm-btn-secondary"
            onClick={() => setEditOpen((v) => !v)}
          >
            {editOpen ? "Cancel edit" : "Edit"}
          </button>
        </div>
        {editOpen ? (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveCustomer.mutate();
            }}
          >
            <div className="lm-form-row">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="mobile">Mobile</label>
              <input
                id="mobile"
                value={editForm.mobile}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, mobile: e.target.value }))
                }
                required
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="pan">PAN</label>
              <input
                id="pan"
                value={editForm.pan}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, pan: e.target.value }))
                }
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                rows={2}
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className="lm-btn"
              disabled={saveCustomer.isPending}
            >
              Save
            </button>
          </form>
        ) : (
          <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
            <div>
              <dt className="lm-muted">PAN</dt>
              <dd style={{ margin: 0 }}>{c.pan ?? "—"}</dd>
            </div>
            <div>
              <dt className="lm-muted">Address</dt>
              <dd style={{ margin: 0 }}>{c.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="lm-muted">Status</dt>
              <dd style={{ margin: 0 }}>
                {c.blacklisted ? (
                  <span className="lm-badge">
                    Blacklisted
                    {c.blacklistReason ? `: ${c.blacklistReason}` : ""}
                  </span>
                ) : (
                  "Active"
                )}
                {c.npa ? (
                  <span className="lm-badge" style={{ marginLeft: "0.5rem" }}>
                    NPA{c.npaReason ? `: ${c.npaReason}` : ""}
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="lm-card">
        <h2>Blacklist</h2>
        <div className="lm-form">
          <div className="lm-form-row">
            <label htmlFor="bl-reason">Reason</label>
            <input
              id="bl-reason"
              value={blacklistReason}
              onChange={(e) => setBlacklistReason(e.target.value)}
            />
          </div>
          <div className="lm-actions">
            {!c.blacklisted ? (
              <button
                type="button"
                className="lm-btn lm-btn-danger"
                disabled={blacklist.isPending}
                onClick={() => blacklist.mutate(true)}
              >
                Blacklist
              </button>
            ) : (
              <button
                type="button"
                className="lm-btn lm-btn-secondary"
                disabled={blacklist.isPending}
                onClick={() => blacklist.mutate(false)}
              >
                Remove blacklist
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lm-card">
        <h2>NPA</h2>
        <p className="lm-muted">
          Manual customer-level flag — requires approval.
        </p>
        {!c.npa ? (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              requestNpaMark.mutate();
            }}
          >
            <div className="lm-form-row">
              <label htmlFor="npa-reason">Reason</label>
              <input
                id="npa-reason"
                value={npaReason}
                onChange={(e) => setNpaReason(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="lm-btn lm-btn-secondary"
              disabled={requestNpaMark.isPending}
            >
              Request NPA mark
            </button>
          </form>
        ) : (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              requestNpaClear.mutate();
            }}
          >
            <div className="lm-form-row">
              <label htmlFor="npa-clear">Reason (optional)</label>
              <input
                id="npa-clear"
                value={npaClearReason}
                onChange={(e) => setNpaClearReason(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="lm-btn lm-btn-secondary"
              disabled={requestNpaClear.isPending}
            >
              Request NPA clear
            </button>
          </form>
        )}
      </div>

      <DocumentsPanel entityType="CUSTOMER" entityId={c.id} />

      <div className="lm-card lm-table-wrap">
        <h2>Loans</h2>
        {loans.data?.length ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Status</th>
                <th>Principal</th>
              </tr>
            </thead>
            <tbody>
              {loans.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link to="/app/loans/$id" params={{ id: l.id }}>
                      {l.loanNumber ?? l.id}
                    </Link>
                  </td>
                  <td>
                    <span className="lm-badge">{l.status}</span>
                  </td>
                  <td>{l.principal ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="lm-muted">No loans yet.</p>
        )}
      </div>
    </div>
  );
}

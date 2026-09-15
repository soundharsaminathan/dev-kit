import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

type Installment = {
  id: string;
  number: number;
  dueDate: string;
  principalDue: string | number;
  interestDue: string | number;
  penaltyDue: string | number;
  paidPrincipal: string | number;
  paidInterest: string | number;
  paidPenalty: string | number;
  status: string;
};

type LoanDetail = {
  id: string;
  loanNumber: string;
  status: string;
  principal: string | number;
  annualRatePercent: string | number;
  tenureInstallments: number;
  frequency: string;
  monthlyFirstEmiOption: string;
  netDisbursement?: string | number | null;
  customer?: { id: string; name: string; customerNumber: string };
  product?: { id: string; name: string; code: string };
  installments?: Installment[];
};

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export const Route = createFileRoute("/app/loans/$id")({
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { id } = Route.useParams();
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loan = useQuery({
    queryKey: ["loans", id],
    queryFn: () => api.get<LoanDetail>(`/loans/${id}`),
  });

  const invalidate = async () => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ["loans", id] });
  };

  const onError = (err: unknown) => {
    setError(err instanceof Error ? err.message : "Action failed");
  };

  const submit = useMutation({
    mutationFn: () => api.post(`/loans/${id}/submit`),
    onSuccess: invalidate,
    onError,
  });
  const verify = useMutation({
    mutationFn: () => api.post(`/loans/${id}/verify`),
    onSuccess: invalidate,
    onError,
  });
  const requestApproval = useMutation({
    mutationFn: () => api.post(`/loans/${id}/request-approval`),
    onSuccess: invalidate,
    onError,
  });
  const approve = useMutation({
    mutationFn: () => api.post(`/loans/${id}/approve`),
    onSuccess: invalidate,
    onError,
  });
  const reject = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/reject`, { reason: rejectReason.trim() }),
    onSuccess: invalidate,
    onError,
  });
  const disburse = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/disburse`, {
        disbursementDate: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: invalidate,
    onError,
  });

  if (loan.isLoading) return <p>Loading…</p>;
  if (loan.isError || !loan.data) {
    return (
      <p className="lm-error">
        {(loan.error as Error)?.message ?? "Loan not found"}
      </p>
    );
  }

  const l = loan.data;
  const installments = l.installments ?? [];
  const outstanding = installments.reduce((sum, row) => {
    return (
      sum +
      Math.max(0, num(row.principalDue) - num(row.paidPrincipal)) +
      Math.max(0, num(row.interestDue) - num(row.paidInterest)) +
      Math.max(0, num(row.penaltyDue) - num(row.paidPenalty))
    );
  }, 0);

  const busy =
    submit.isPending ||
    verify.isPending ||
    requestApproval.isPending ||
    approve.isPending ||
    reject.isPending ||
    disburse.isPending;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>{l.loanNumber}</h1>
          <p>
            {l.customer?.name ?? "Customer"} · {l.product?.name ?? "Product"}
          </p>
        </div>
        <div className="lm-actions">
          {l.status === "DRAFT" ? (
            <button
              type="button"
              className="lm-btn lm-btn-secondary"
              disabled={busy}
              onClick={() => submit.mutate()}
            >
              Submit
            </button>
          ) : null}
          {l.status === "SUBMITTED" ? (
            <button
              type="button"
              className="lm-btn lm-btn-secondary"
              disabled={busy}
              onClick={() => verify.mutate()}
            >
              Verify
            </button>
          ) : null}
          {l.status === "VERIFIED" ? (
            <>
              <button
                type="button"
                className="lm-btn lm-btn-secondary"
                disabled={busy}
                onClick={() => requestApproval.mutate()}
              >
                Request approval
              </button>
              <button
                type="button"
                className="lm-btn"
                disabled={busy}
                onClick={() => approve.mutate()}
              >
                Approve
              </button>
            </>
          ) : null}
          {l.status === "APPROVED" ? (
            <button
              type="button"
              className="lm-btn"
              disabled={busy}
              onClick={() => disburse.mutate()}
            >
              Disburse
            </button>
          ) : null}
          {["SUBMITTED", "VERIFIED"].includes(l.status) ? (
            <>
              <input
                placeholder="Reject reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ minWidth: "8rem", padding: "0.4rem 0.5rem" }}
              />
              <button
                type="button"
                className="lm-btn lm-btn-danger"
                disabled={busy || !rejectReason.trim()}
                onClick={() => reject.mutate()}
              >
                Reject
              </button>
            </>
          ) : null}
          {["ACTIVE", "DISBURSED"].includes(l.status) ? (
            <Link
              to="/app/collections"
              search={{ loanId: l.id }}
              className="lm-btn lm-btn-secondary"
            >
              Record payment
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}

      <div className="lm-grid-stats">
        <div className="lm-stat">
          <strong>
            <span className="lm-badge">{l.status}</span>
          </strong>
          <span>Status</span>
        </div>
        <div className="lm-stat">
          <strong>{num(l.principal).toLocaleString("en-IN")}</strong>
          <span>Principal</span>
        </div>
        <div className="lm-stat">
          <strong>{num(l.annualRatePercent)}%</strong>
          <span>Rate ({l.frequency})</span>
        </div>
        <div className="lm-stat">
          <strong>
            {installments.length
              ? outstanding.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </strong>
          <span>Outstanding</span>
        </div>
      </div>

      <div className="lm-card lm-table-wrap">
        <h2>EMI schedule</h2>
        {installments.length === 0 ? (
          <p className="lm-muted">Schedule is generated at disbursement.</p>
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Due</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Penalty</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((row) => {
                const paid =
                  num(row.paidPrincipal) +
                  num(row.paidInterest) +
                  num(row.paidPenalty);
                return (
                  <tr key={row.id}>
                    <td>{row.number}</td>
                    <td>{String(row.dueDate).slice(0, 10)}</td>
                    <td>{num(row.principalDue).toFixed(2)}</td>
                    <td>{num(row.interestDue).toFixed(2)}</td>
                    <td>{num(row.penaltyDue).toFixed(2)}</td>
                    <td>{paid.toFixed(2)}</td>
                    <td>{row.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/constants";
import { DocumentsPanel } from "@/lib/documents-panel";

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

type Payment = {
  id: string;
  amount: string | number;
  paymentDate: string;
  mode: string;
  reference?: string | null;
  reversed?: boolean;
};

type LoanDetail = {
  id: string;
  loanNumber: string;
  status: string;
  dpd?: number;
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
  const [msg, setMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [disburseForm, setDisburseForm] = useState({
    disbursementDate: new Date().toISOString().slice(0, 10),
    mode: "CASH" as PaymentMode,
    reference: "",
  });
  const [rateForm, setRateForm] = useState({
    annualRatePercent: "",
    reason: "",
  });
  const [penaltyForm, setPenaltyForm] = useState({
    penaltyDailyPercent: "",
    reason: "",
  });
  const [waiverForm, setWaiverForm] = useState({
    installmentId: "",
    amount: "",
    reason: "",
  });
  const [interestWaiverForm, setInterestWaiverForm] = useState({
    installmentId: "",
    amount: "",
    reason: "",
  });
  const [foreclosureReason, setForeclosureReason] = useState("");
  const [foreclosureQuote, setForeclosureQuote] = useState<unknown>(null);
  const [settlementForm, setSettlementForm] = useState({
    settlementAmount: "",
    reason: "",
  });
  const [writeOffReason, setWriteOffReason] = useState("");
  const [restructureForm, setRestructureForm] = useState({
    newTenure: "",
    newRate: "",
    reason: "",
  });

  const loan = useQuery({
    queryKey: ["loans", id],
    queryFn: () => api.get<LoanDetail>(`/loans/${id}`),
  });

  const payments = useQuery({
    queryKey: ["payments", id],
    enabled: Boolean(loan.data),
    queryFn: () => api.get<Payment[]>(`/payments/loan/${id}`),
  });

  const invalidate = async () => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ["loans", id] });
    await queryClient.invalidateQueries({ queryKey: ["payments", id] });
  };

  const onError = (err: unknown) => {
    setMsg(null);
    setError(err instanceof Error ? err.message : "Action failed");
  };

  const onOk = (text: string) => {
    setError(null);
    setMsg(text);
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
        disbursementDate: disburseForm.disbursementDate,
        mode: disburseForm.mode,
        reference: disburseForm.reference || undefined,
      }),
    onSuccess: async () => {
      onOk("Disbursed.");
      await invalidate();
    },
    onError,
  });

  const requestRateChange = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-rate-change`, {
        annualRatePercent: Number(rateForm.annualRatePercent),
        reason: rateForm.reason || undefined,
      }),
    onSuccess: () => onOk("Rate change submitted for approval."),
    onError,
  });

  const requestPenaltyOverride = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-penalty-override`, {
        penaltyDailyPercent: Number(penaltyForm.penaltyDailyPercent),
        reason: penaltyForm.reason || undefined,
      }),
    onSuccess: () => onOk("Penalty override submitted for approval."),
    onError,
  });

  const requestPenaltyWaiver = useMutation({
    mutationFn: () =>
      api.post("/payments/waiver/request", {
        installmentId: waiverForm.installmentId,
        amount: Number(waiverForm.amount),
        reason: waiverForm.reason || undefined,
      }),
    onSuccess: () => onOk("Penalty waiver submitted for approval."),
    onError,
  });

  const requestInterestWaiver = useMutation({
    mutationFn: () =>
      api.post("/payments/interest-waiver/request", {
        installmentId: interestWaiverForm.installmentId,
        amount: Number(interestWaiverForm.amount),
        reason: interestWaiverForm.reason || undefined,
      }),
    onSuccess: () => onOk("Interest waiver submitted for approval."),
    onError,
  });

  const requestReversal = useMutation({
    mutationFn: (paymentId: string) =>
      api.post(`/payments/${paymentId}/request-reversal`, {}),
    onSuccess: () => onOk("Reversal submitted for approval."),
    onError,
  });

  const loadForeclosureQuote = useMutation({
    mutationFn: () => api.get(`/loans/${id}/foreclosure-quote`),
    onSuccess: (data) => {
      setForeclosureQuote(data);
      onOk("Foreclosure quote loaded.");
    },
    onError,
  });

  const requestForeclosure = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-foreclosure`, {
        reason: foreclosureReason.trim() || undefined,
      }),
    onSuccess: () => onOk("Foreclosure request submitted for approval."),
    onError,
  });

  const requestSettlement = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-settlement`, {
        settlementAmount: Number(settlementForm.settlementAmount),
        reason: settlementForm.reason || undefined,
      }),
    onSuccess: () => onOk("Settlement request submitted for approval."),
    onError,
  });

  const requestWriteOff = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-write-off`, {
        reason: writeOffReason.trim() || undefined,
      }),
    onSuccess: () => onOk("Write-off request submitted for approval."),
    onError,
  });

  const requestRestructure = useMutation({
    mutationFn: () =>
      api.post(`/loans/${id}/request-restructure`, {
        newTenure: Number(restructureForm.newTenure),
        newRate: Number(restructureForm.newRate),
        reason: restructureForm.reason || undefined,
      }),
    onSuccess: () => onOk("Restructure request submitted for approval."),
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

  const postDisburse = ["ACTIVE", "DISBURSED", "WRITTEN_OFF"].includes(
    l.status,
  );

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
          {postDisburse ? (
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
      {msg ? <p style={{ color: "var(--lm-success)" }}>{msg}</p> : null}

      <div className="lm-grid-stats">
        <div className="lm-stat">
          <strong>
            <span className="lm-badge">{l.status}</span>
          </strong>
          <span>Status</span>
        </div>
        <div className="lm-stat">
          <strong>{l.dpd != null ? `${l.dpd} days` : "—"}</strong>
          <span>DPD</span>
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

      {l.status === "APPROVED" ? (
        <div className="lm-card">
          <h2>Disburse</h2>
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              disburse.mutate();
            }}
          >
            <div className="lm-form-row">
              <label htmlFor="disb-date">Disbursement date</label>
              <input
                id="disb-date"
                type="date"
                value={disburseForm.disbursementDate}
                onChange={(e) =>
                  setDisburseForm((f) => ({
                    ...f,
                    disbursementDate: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="disb-mode">Mode</label>
              <select
                id="disb-mode"
                value={disburseForm.mode}
                onChange={(e) =>
                  setDisburseForm((f) => ({
                    ...f,
                    mode: e.target.value as PaymentMode,
                  }))
                }
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="lm-form-row">
              <label htmlFor="disb-ref">Reference</label>
              <input
                id="disb-ref"
                value={disburseForm.reference}
                onChange={(e) =>
                  setDisburseForm((f) => ({ ...f, reference: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className="lm-btn"
              disabled={disburse.isPending}
            >
              Disburse
            </button>
          </form>
        </div>
      ) : null}

      {["ACTIVE", "DISBURSED"].includes(l.status) ? (
        <>
          <div className="lm-card">
            <h2>Rate change</h2>
            <form
              className="lm-form"
              onSubmit={(e) => {
                e.preventDefault();
                requestRateChange.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="new-rate">New rate (% p.a.)</label>
                <input
                  id="new-rate"
                  type="number"
                  step="0.01"
                  value={rateForm.annualRatePercent}
                  onChange={(e) =>
                    setRateForm((f) => ({
                      ...f,
                      annualRatePercent: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="lm-form-row">
                <label htmlFor="rate-reason">Reason</label>
                <input
                  id="rate-reason"
                  value={rateForm.reason}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestRateChange.isPending}
              >
                Request rate change
              </button>
            </form>
          </div>

          <div className="lm-card">
            <h2>Penalty override</h2>
            <form
              className="lm-form"
              onSubmit={(e) => {
                e.preventDefault();
                requestPenaltyOverride.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="penalty-rate">Daily penalty (%)</label>
                <input
                  id="penalty-rate"
                  type="number"
                  step="0.001"
                  value={penaltyForm.penaltyDailyPercent}
                  onChange={(e) =>
                    setPenaltyForm((f) => ({
                      ...f,
                      penaltyDailyPercent: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="lm-form-row">
                <label htmlFor="penalty-reason">Reason</label>
                <input
                  id="penalty-reason"
                  value={penaltyForm.reason}
                  onChange={(e) =>
                    setPenaltyForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestPenaltyOverride.isPending}
              >
                Request penalty override
              </button>
            </form>
          </div>

          <div className="lm-card">
            <h2>Waivers</h2>
            <form
              className="lm-form"
              onSubmit={(e) => {
                e.preventDefault();
                requestPenaltyWaiver.mutate();
              }}
            >
              <p className="lm-muted">Penalty waiver</p>
              <div className="lm-form-row">
                <label htmlFor="pw-inst">Installment</label>
                <select
                  id="pw-inst"
                  value={waiverForm.installmentId}
                  onChange={(e) =>
                    setWaiverForm((f) => ({
                      ...f,
                      installmentId: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select EMI</option>
                  {installments.map((row) => (
                    <option key={row.id} value={row.id}>
                      #{row.number} · {String(row.dueDate).slice(0, 10)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lm-form-row">
                <label htmlFor="pw-amt">Amount</label>
                <input
                  id="pw-amt"
                  type="number"
                  step="0.01"
                  value={waiverForm.amount}
                  onChange={(e) =>
                    setWaiverForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestPenaltyWaiver.isPending}
              >
                Request penalty waiver
              </button>
            </form>
            <form
              className="lm-form"
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                requestInterestWaiver.mutate();
              }}
            >
              <p className="lm-muted">Interest waiver</p>
              <div className="lm-form-row">
                <label htmlFor="iw-inst">Installment</label>
                <select
                  id="iw-inst"
                  value={interestWaiverForm.installmentId}
                  onChange={(e) =>
                    setInterestWaiverForm((f) => ({
                      ...f,
                      installmentId: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select EMI</option>
                  {installments.map((row) => (
                    <option key={row.id} value={row.id}>
                      #{row.number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lm-form-row">
                <label htmlFor="iw-amt">Amount</label>
                <input
                  id="iw-amt"
                  type="number"
                  step="0.01"
                  value={interestWaiverForm.amount}
                  onChange={(e) =>
                    setInterestWaiverForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestInterestWaiver.isPending}
              >
                Request interest waiver
              </button>
            </form>
          </div>

          <div className="lm-card">
            <h2>Closure requests</h2>
            <div className="lm-actions" style={{ marginBottom: "1rem" }}>
              <button
                type="button"
                className="lm-btn lm-btn-secondary"
                disabled={loadForeclosureQuote.isPending}
                onClick={() => loadForeclosureQuote.mutate()}
              >
                Foreclosure quote
              </button>
            </div>
            {foreclosureQuote ? (
              <pre
                className="lm-muted"
                style={{ fontSize: "0.85rem", overflow: "auto" }}
              >
                {JSON.stringify(foreclosureQuote, null, 2)}
              </pre>
            ) : null}
            <form
              className="lm-form"
              onSubmit={(e) => {
                e.preventDefault();
                requestForeclosure.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="fc-reason">Foreclosure reason</label>
                <input
                  id="fc-reason"
                  value={foreclosureReason}
                  onChange={(e) => setForeclosureReason(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestForeclosure.isPending}
              >
                Request foreclosure
              </button>
            </form>
            <form
              className="lm-form"
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                requestSettlement.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="settle-amt">Settlement amount</label>
                <input
                  id="settle-amt"
                  type="number"
                  step="0.01"
                  value={settlementForm.settlementAmount}
                  onChange={(e) =>
                    setSettlementForm((f) => ({
                      ...f,
                      settlementAmount: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="lm-form-row">
                <label htmlFor="settle-reason">Reason</label>
                <input
                  id="settle-reason"
                  value={settlementForm.reason}
                  onChange={(e) =>
                    setSettlementForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestSettlement.isPending}
              >
                Request settlement
              </button>
            </form>
            <form
              className="lm-form"
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                requestWriteOff.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="wo-reason">Write-off reason</label>
                <input
                  id="wo-reason"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-danger"
                disabled={requestWriteOff.isPending}
              >
                Request write-off
              </button>
            </form>
            <form
              className="lm-form"
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                requestRestructure.mutate();
              }}
            >
              <div className="lm-form-row">
                <label htmlFor="rs-tenure">New tenure</label>
                <input
                  id="rs-tenure"
                  type="number"
                  min={1}
                  value={restructureForm.newTenure}
                  onChange={(e) =>
                    setRestructureForm((f) => ({
                      ...f,
                      newTenure: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="lm-form-row">
                <label htmlFor="rs-rate">New rate (%)</label>
                <input
                  id="rs-rate"
                  type="number"
                  step="0.01"
                  value={restructureForm.newRate}
                  onChange={(e) =>
                    setRestructureForm((f) => ({
                      ...f,
                      newRate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="lm-btn lm-btn-secondary"
                disabled={requestRestructure.isPending}
              >
                Request restructure
              </button>
            </form>
          </div>
        </>
      ) : null}

      {payments.data && payments.data.length > 0 ? (
        <div className="lm-card lm-table-wrap">
          <h2>Payments</h2>
          <table className="lm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Reference</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payments.data.map((p) => (
                <tr key={p.id}>
                  <td>{String(p.paymentDate).slice(0, 10)}</td>
                  <td>{num(p.amount).toFixed(2)}</td>
                  <td>{p.mode}</td>
                  <td>{p.reference ?? "—"}</td>
                  <td>
                    {p.reversed ? (
                      "Reversed"
                    ) : (
                      <button
                        type="button"
                        className="lm-btn lm-btn-secondary"
                        disabled={requestReversal.isPending}
                        onClick={() => requestReversal.mutate(p.id)}
                      >
                        Request reversal
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <DocumentsPanel entityType="LOAN" entityId={l.id} />

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
                const statusLabel =
                  row.status === "SKIPPED" ? "SKIP_NEXT_EMI" : row.status;
                return (
                  <tr key={row.id}>
                    <td>{row.number}</td>
                    <td>{String(row.dueDate).slice(0, 10)}</td>
                    <td>{num(row.principalDue).toFixed(2)}</td>
                    <td>{num(row.interestDue).toFixed(2)}</td>
                    <td>{num(row.penaltyDue).toFixed(2)}</td>
                    <td>{paid.toFixed(2)}</td>
                    <td>{statusLabel}</td>
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

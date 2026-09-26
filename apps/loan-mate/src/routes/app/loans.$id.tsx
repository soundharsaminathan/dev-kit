import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/constants";
import { DocumentsPanel } from "@/lib/documents-panel";
import {
  COLLECTION_PAGE_ROLES,
  LOAN_APPROVE_ROLES,
  LOAN_REJECT_ROLES,
  roleAllowed,
} from "@/lib/page-access";
import {
  FormError,
  FormInput,
  FormSelect,
  FormSuccess,
} from "@/modules/ui/form-fields";

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
  const navigate = useNavigate();
  const { api, user } = useAuth();
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
      <FormError>
        {(loan.error as Error)?.message ?? "Loan not found"}
      </FormError>
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
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                to: "/app/loans/$id/schedule",
                params: { id: l.id },
              })
            }
          >
            <Icon name="calendar" />
            EMI schedule
          </Button>
          {l.status === "DRAFT" ? (
            <Button
              type="button"
              variant="outline"
              isDisabled={busy}
              onClick={() => submit.mutate()}
            >
              Submit
            </Button>
          ) : null}
          {l.status === "SUBMITTED" ? (
            <Button
              type="button"
              variant="outline"
              isDisabled={busy}
              onClick={() => verify.mutate()}
            >
              Verify
            </Button>
          ) : null}
          {l.status === "VERIFIED" ? (
            <>
              <Button
                type="button"
                variant="outline"
                isDisabled={busy}
                onClick={() => requestApproval.mutate()}
              >
                Request approval
              </Button>
              {roleAllowed(user?.role, LOAN_APPROVE_ROLES) ? (
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={busy}
                  onClick={() => approve.mutate()}
                >
                  Approve
                </Button>
              ) : null}
            </>
          ) : null}
          {["SUBMITTED", "VERIFIED"].includes(l.status) &&
          roleAllowed(user?.role, LOAN_REJECT_ROLES) ? (
            <>
              <FormInput
                label="Reject reason"
                value={rejectReason}
                onChange={setRejectReason}
              />
              <Button
                type="button"
                variant="danger"
                isDisabled={busy || !rejectReason.trim()}
                onClick={() => reject.mutate()}
              >
                Reject
              </Button>
            </>
          ) : null}
          {postDisburse && roleAllowed(user?.role, COLLECTION_PAGE_ROLES) ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigate({
                  to: "/app/collections",
                  search: { loanId: l.id },
                })
              }
            >
              <Icon name="credit-card" />
              Record payment
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <FormError>{error}</FormError> : null}
      {msg ? <FormSuccess>{msg}</FormSuccess> : null}

      <div className="lm-grid-stats">
        <div className="lm-stat">
          <strong>
            <Badge appearance="subtle">{l.status}</Badge>
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
            <FormInput
              label="Disbursement date"
              type="date"
              value={disburseForm.disbursementDate}
              onChange={(disbursementDate) =>
                setDisburseForm((f) => ({ ...f, disbursementDate }))
              }
              required
            />
            <FormSelect
              label="Mode"
              value={disburseForm.mode}
              onChange={(mode) =>
                setDisburseForm((f) => ({
                  ...f,
                  mode: mode as PaymentMode,
                }))
              }
              options={PAYMENT_MODES.map((m) => ({
                value: m,
                label: m.replaceAll("_", " "),
              }))}
            />
            <FormInput
              label="Reference"
              value={disburseForm.reference}
              onChange={(reference) =>
                setDisburseForm((f) => ({ ...f, reference }))
              }
            />
            <Button
              type="submit"
              variant="primary"
              isDisabled={disburse.isPending}
            >
              Disburse
            </Button>
          </form>
        </div>
      ) : null}

      <Tabs aria-label="Loan" defaultSelectedKey="schedule">
        <TabList variant="line" className="lm-tab-list">
          <Tab id="schedule">Schedule</Tab>
          <Tab id="payments">Payments</Tab>
          {["ACTIVE", "DISBURSED"].includes(l.status) ? (
            <Tab id="servicing">Servicing</Tab>
          ) : null}
          <Tab id="documents">Documents</Tab>
        </TabList>
        <TabPanel id="schedule">
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
        </TabPanel>
        <TabPanel id="payments">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isDisabled={requestReversal.isPending}
                            onClick={() => requestReversal.mutate(p.id)}
                          >
                            Request reversal
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lm-muted">No payments yet.</p>
          )}
        </TabPanel>
        {["ACTIVE", "DISBURSED"].includes(l.status) ? (
          <TabPanel id="servicing">
            <div className="lm-card">
              <h2>Rate change</h2>
              <form
                className="lm-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  requestRateChange.mutate();
                }}
              >
                <FormInput
                  label="New rate (% p.a.)"
                  type="number"
                  step="0.01"
                  value={rateForm.annualRatePercent}
                  onChange={(annualRatePercent) =>
                    setRateForm((f) => ({ ...f, annualRatePercent }))
                  }
                  required
                />
                <FormInput
                  label="Reason"
                  value={rateForm.reason}
                  onChange={(reason) => setRateForm((f) => ({ ...f, reason }))}
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestRateChange.isPending}
                >
                  Request rate change
                </Button>
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
                <FormInput
                  label="Daily penalty (%)"
                  type="number"
                  step="0.001"
                  value={penaltyForm.penaltyDailyPercent}
                  onChange={(penaltyDailyPercent) =>
                    setPenaltyForm((f) => ({ ...f, penaltyDailyPercent }))
                  }
                  required
                />
                <FormInput
                  label="Reason"
                  value={penaltyForm.reason}
                  onChange={(reason) =>
                    setPenaltyForm((f) => ({ ...f, reason }))
                  }
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestPenaltyOverride.isPending}
                >
                  Request penalty override
                </Button>
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
                <FormSelect
                  label="Installment"
                  placeholder="Select EMI"
                  value={waiverForm.installmentId}
                  onChange={(installmentId) =>
                    setWaiverForm((f) => ({ ...f, installmentId }))
                  }
                  required
                  options={installments.map((row) => ({
                    value: row.id,
                    label: `#${row.number} · ${String(row.dueDate).slice(0, 10)}`,
                  }))}
                />
                <FormInput
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={waiverForm.amount}
                  onChange={(amount) =>
                    setWaiverForm((f) => ({ ...f, amount }))
                  }
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestPenaltyWaiver.isPending}
                >
                  Request penalty waiver
                </Button>
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
                <FormSelect
                  label="Installment"
                  placeholder="Select EMI"
                  value={interestWaiverForm.installmentId}
                  onChange={(installmentId) =>
                    setInterestWaiverForm((f) => ({ ...f, installmentId }))
                  }
                  required
                  options={installments.map((row) => ({
                    value: row.id,
                    label: `#${row.number}`,
                  }))}
                />
                <FormInput
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={interestWaiverForm.amount}
                  onChange={(amount) =>
                    setInterestWaiverForm((f) => ({ ...f, amount }))
                  }
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestInterestWaiver.isPending}
                >
                  Request interest waiver
                </Button>
              </form>
            </div>

            <div className="lm-card">
              <h2>Closure requests</h2>
              <div className="lm-actions" style={{ marginBottom: "1rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={loadForeclosureQuote.isPending}
                  onClick={() => loadForeclosureQuote.mutate()}
                >
                  Foreclosure quote
                </Button>
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
                <FormInput
                  label="Foreclosure reason"
                  value={foreclosureReason}
                  onChange={setForeclosureReason}
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestForeclosure.isPending}
                >
                  Request foreclosure
                </Button>
              </form>
              <form
                className="lm-form"
                style={{ marginTop: "1rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  requestSettlement.mutate();
                }}
              >
                <FormInput
                  label="Settlement amount"
                  type="number"
                  step="0.01"
                  value={settlementForm.settlementAmount}
                  onChange={(settlementAmount) =>
                    setSettlementForm((f) => ({ ...f, settlementAmount }))
                  }
                  required
                />
                <FormInput
                  label="Reason"
                  value={settlementForm.reason}
                  onChange={(reason) =>
                    setSettlementForm((f) => ({ ...f, reason }))
                  }
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestSettlement.isPending}
                >
                  Request settlement
                </Button>
              </form>
              <form
                className="lm-form"
                style={{ marginTop: "1rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  requestWriteOff.mutate();
                }}
              >
                <FormInput
                  label="Write-off reason"
                  value={writeOffReason}
                  onChange={setWriteOffReason}
                />
                <Button
                  type="submit"
                  variant="danger"
                  isDisabled={requestWriteOff.isPending}
                >
                  Request write-off
                </Button>
              </form>
              <form
                className="lm-form"
                style={{ marginTop: "1rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  requestRestructure.mutate();
                }}
              >
                <FormInput
                  label="New tenure"
                  type="number"
                  min={1}
                  value={restructureForm.newTenure}
                  onChange={(newTenure) =>
                    setRestructureForm((f) => ({ ...f, newTenure }))
                  }
                  required
                />
                <FormInput
                  label="New rate (%)"
                  type="number"
                  step="0.01"
                  value={restructureForm.newRate}
                  onChange={(newRate) =>
                    setRestructureForm((f) => ({ ...f, newRate }))
                  }
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  isDisabled={requestRestructure.isPending}
                >
                  Request restructure
                </Button>
              </form>
            </div>
          </TabPanel>
        ) : null}
        <TabPanel id="documents">
          <DocumentsPanel entityType="LOAN" entityId={l.id} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

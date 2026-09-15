import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  ADVANCE_TREATMENTS,
  PAYMENT_MODES,
  type AdvanceTreatment,
  type PaymentMode,
} from "@/lib/constants";

type Loan = {
  id: string;
  loanNumber?: string;
  customerName?: string;
  status: string;
  outstanding?: number;
};

type CollectionsSearch = { loanId?: string };

export const Route = createFileRoute("/app/collections")({
  validateSearch: (search: Record<string, unknown>): CollectionsSearch => {
    const next: CollectionsSearch = {};
    if (typeof search.loanId === "string") {
      next.loanId = search.loanId;
    }
    return next;
  },
  component: CollectionsPage,
});

function CollectionsPage() {
  const { api } = useAuth();
  const { loanId: presetLoanId } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    loanId: presetLoanId ?? "",
    amount: "",
    mode: "CASH" as PaymentMode,
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: "",
    details: "",
    isAdvance: false,
    advanceTreatment: "REDUCE_PRINCIPAL" as AdvanceTreatment,
  });

  const loans = useQuery({
    queryKey: ["loans", "collections"],
    queryFn: async () => {
      const all = await api.get<Loan[]>("/loans");
      return all.filter((l) => ["DISBURSED", "ACTIVE"].includes(l.status));
    },
  });

  const selected = loans.data?.find((l) => l.id === form.loanId);

  const pay = useMutation({
    mutationFn: () =>
      api.post("/payments", {
        loanId: form.loanId,
        amount: Number(form.amount),
        mode: form.mode,
        paymentDate: form.paymentDate,
        reference: form.reference || undefined,
        details: form.details || undefined,
        advanceTreatment: form.isAdvance ? form.advanceTreatment : undefined,
      }),
    onSuccess: () => {
      setError(null);
      setSuccess("Payment recorded.");
      setForm((f) => ({
        ...f,
        amount: "",
        reference: "",
        details: "",
        isAdvance: false,
      }));
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Payment failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Collections</h1>
          <p>
            Staff-entered payments — Penalty → Interest → Principal, oldest
            overdue first.
          </p>
        </div>
      </div>

      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            pay.mutate();
          }}
        >
          <div className="lm-form-row">
            <label htmlFor="loanId">Loan</label>
            <select
              id="loanId"
              value={form.loanId}
              onChange={(e) =>
                setForm((f) => ({ ...f, loanId: e.target.value }))
              }
              required
            >
              <option value="">Select loan</option>
              {(loans.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.loanNumber ?? l.id}
                  {l.customerName ? ` — ${l.customerName}` : ""}
                </option>
              ))}
            </select>
            {selected?.outstanding != null ? (
              <p className="lm-muted" style={{ margin: 0 }}>
                Outstanding: {selected.outstanding}
              </p>
            ) : null}
          </div>
          <div className="lm-form-row">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              min={0.01}
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="mode">Mode</label>
            <select
              id="mode"
              value={form.mode}
              onChange={(e) =>
                setForm((f) => ({
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
            <label htmlFor="paymentDate">Payment date</label>
            <input
              id="paymentDate"
              type="date"
              value={form.paymentDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentDate: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="reference">Reference</label>
            <input
              id="reference"
              value={form.reference}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="details">Details</label>
            <textarea
              id="details"
              rows={2}
              value={form.details}
              onChange={(e) =>
                setForm((f) => ({ ...f, details: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label>
              <input
                type="checkbox"
                checked={form.isAdvance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isAdvance: e.target.checked }))
                }
              />{" "}
              Advance payment
            </label>
          </div>
          {form.isAdvance ? (
            <div className="lm-form-row">
              <label htmlFor="advanceTreatment">Advance treatment</label>
              <select
                id="advanceTreatment"
                value={form.advanceTreatment}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    advanceTreatment: e.target.value as AdvanceTreatment,
                  }))
                }
                required
              >
                {ADVANCE_TREATMENTS.map((t) => (
                  <option key={t} value={t}>
                    {t.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <p className="lm-error">{error}</p> : null}
          {success ? (
            <p style={{ color: "var(--lm-success)" }}>{success}</p>
          ) : null}
          <button type="submit" className="lm-btn" disabled={pay.isPending}>
            Record payment
          </button>
        </form>
      </div>
    </div>
  );
}

import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  ADVANCE_TREATMENTS,
  type AdvanceTreatment,
  PAYMENT_MODES,
  type PaymentMode,
} from "@/lib/constants";
import {
  FormCheckbox,
  FormInput,
  FormSelect,
  FormTextArea,
} from "@/modules/ui/form-fields";

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
      const all = await api.get<
        Array<
          Loan & {
            customer?: { name?: string };
          }
        >
      >("/loans");
      return all
        .filter((l) =>
          ["DISBURSED", "ACTIVE", "WRITTEN_OFF"].includes(l.status),
        )
        .map((l) => ({
          ...l,
          customerName: l.customerName ?? l.customer?.name,
        }));
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
            overdue first. Collection officers only see loans for customers
            assigned to them.
          </p>
        </div>
      </div>

      {loans.isSuccess && !(loans.data?.length ?? 0) ? (
        <div className="lm-card">
          <p className="lm-muted">
            No collectible loans in your queue. Ask a manager to assign
            customers as collection targets.
          </p>
        </div>
      ) : null}

      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            pay.mutate();
          }}
        >
          <FormSelect
            label="Loan"
            placeholder="Select loan"
            value={form.loanId}
            onChange={(loanId) => setForm((f) => ({ ...f, loanId }))}
            required
            options={(loans.data ?? []).map((l) => ({
              value: l.id,
              label: `${l.loanNumber ?? l.id}${l.customerName ? ` — ${l.customerName}` : ""}`,
            }))}
          />
          {selected?.outstanding != null ? (
            <p className="lm-muted" style={{ margin: 0 }}>
              Outstanding: {selected.outstanding}
            </p>
          ) : null}
          <FormInput
            label="Amount"
            type="number"
            min={0.01}
            step="0.01"
            value={form.amount}
            onChange={(amount) => setForm((f) => ({ ...f, amount }))}
            required
          />
          <FormSelect
            label="Mode"
            value={form.mode}
            onChange={(mode) =>
              setForm((f) => ({ ...f, mode: mode as PaymentMode }))
            }
            options={PAYMENT_MODES.map((m) => ({
              value: m,
              label: m.replaceAll("_", " "),
            }))}
          />
          <FormInput
            label="Payment date"
            type="date"
            value={form.paymentDate}
            onChange={(paymentDate) => setForm((f) => ({ ...f, paymentDate }))}
            required
          />
          <FormInput
            label="Reference"
            value={form.reference}
            onChange={(reference) => setForm((f) => ({ ...f, reference }))}
          />
          <FormTextArea
            label="Details"
            rows={2}
            value={form.details}
            onChange={(details) => setForm((f) => ({ ...f, details }))}
          />
          <FormCheckbox
            label="Advance payment"
            isSelected={form.isAdvance}
            onChange={(isAdvance) => setForm((f) => ({ ...f, isAdvance }))}
          />
          {form.isAdvance ? (
            <FormSelect
              label="Advance treatment"
              value={form.advanceTreatment}
              onChange={(advanceTreatment) =>
                setForm((f) => ({
                  ...f,
                  advanceTreatment: advanceTreatment as AdvanceTreatment,
                }))
              }
              required
              options={ADVANCE_TREATMENTS.map((t) => ({
                value: t,
                label:
                  t === "SKIP_NEXT_EMI" ? "Skip next EMI" : t.replaceAll("_", " "),
              }))}
            />
          ) : null}
          {error ? <p className="lm-error">{error}</p> : null}
          {success ? (
            <p style={{ color: "var(--lm-success)" }}>{success}</p>
          ) : null}
          <Button type="submit" variant="primary" isDisabled={pay.isPending}>
            Record payment
          </Button>
        </form>
      </div>
    </div>
  );
}

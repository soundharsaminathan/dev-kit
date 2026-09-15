import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    defaultPrincipal: "100000",
    defaultAnnualRate: "18",
    annualRateWeekly: "16",
    annualRateBiweekly: "17",
    annualRateMonthly: "18",
    defaultFrequency: "MONTHLY",
    defaultTenure: "12",
    defaultMonthlyFirstEmi: "EXACT_DAY",
    processingFeePercent: "1",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post("/products", {
        name: form.name.trim(),
        code: form.code.trim(),
        defaultPrincipal: Number(form.defaultPrincipal),
        defaultAnnualRate: Number(form.defaultAnnualRate),
        annualRateWeekly: Number(form.annualRateWeekly),
        annualRateBiweekly: Number(form.annualRateBiweekly),
        annualRateMonthly: Number(form.annualRateMonthly),
        defaultFrequency: form.defaultFrequency,
        defaultTenure: Number(form.defaultTenure),
        defaultMonthlyFirstEmi: form.defaultMonthlyFirstEmi,
        processingFeePercent: Number(form.processingFeePercent),
      }),
    onSuccess: () => {
      void navigate({ to: "/app/products" });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>New product</h1>
          <p>Reducing-balance equated EMI · Actual/365 Fixed.</p>
        </div>
      </div>
      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="lm-form-row">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="code">Code</label>
            <input
              id="code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="principal">Default principal</label>
            <input
              id="principal"
              type="number"
              min={1}
              value={form.defaultPrincipal}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultPrincipal: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="defaultAnnualRate">Default rate (% p.a.)</label>
            <input
              id="defaultAnnualRate"
              type="number"
              step="0.01"
              value={form.defaultAnnualRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultAnnualRate: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="weekly">Weekly rate (% p.a.)</label>
            <input
              id="weekly"
              type="number"
              step="0.01"
              value={form.annualRateWeekly}
              onChange={(e) =>
                setForm((f) => ({ ...f, annualRateWeekly: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="biweekly">Bi-weekly rate (% p.a.)</label>
            <input
              id="biweekly"
              type="number"
              step="0.01"
              value={form.annualRateBiweekly}
              onChange={(e) =>
                setForm((f) => ({ ...f, annualRateBiweekly: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="monthly">Monthly rate (% p.a.)</label>
            <input
              id="monthly"
              type="number"
              step="0.01"
              value={form.annualRateMonthly}
              onChange={(e) =>
                setForm((f) => ({ ...f, annualRateMonthly: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="frequency">Default frequency</label>
            <select
              id="frequency"
              value={form.defaultFrequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultFrequency: e.target.value }))
              }
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="tenure">Default tenure (installments)</label>
            <input
              id="tenure"
              type="number"
              min={1}
              value={form.defaultTenure}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultTenure: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="firstEmi">Default first EMI (monthly)</label>
            <select
              id="firstEmi"
              value={form.defaultMonthlyFirstEmi}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultMonthlyFirstEmi: e.target.value,
                }))
              }
            >
              <option value="EXACT_DAY">Exact day</option>
              <option value="CONVERT_TO_1ST_PARTIAL">
                Convert to 1st + partial
              </option>
              <option value="CONVERT_TO_1ST_NEXT_MONTH">
                Convert to 1st next month
              </option>
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="fee">Processing fee (%)</label>
            <input
              id="fee"
              type="number"
              step="0.01"
              value={form.processingFeePercent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  processingFeePercent: e.target.value,
                }))
              }
            />
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          <div className="lm-actions">
            <button type="submit" className="lm-btn" disabled={create.isPending}>
              Create product
            </button>
            <button
              type="button"
              className="lm-btn lm-btn-secondary"
              onClick={() => void navigate({ to: "/app/products" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

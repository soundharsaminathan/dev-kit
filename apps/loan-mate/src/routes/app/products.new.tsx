import { Button } from "@dev-ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormError, FormInput, FormSelect } from "@/modules/ui/form-fields";

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
          <FormInput
            label="Name"
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
            required
          />
          <FormInput
            label="Code"
            value={form.code}
            onChange={(code) => setForm((f) => ({ ...f, code }))}
            required
          />
          <FormInput
            label="Default principal"
            type="number"
            min={1}
            value={form.defaultPrincipal}
            onChange={(defaultPrincipal) =>
              setForm((f) => ({ ...f, defaultPrincipal }))
            }
            required
          />
          <FormInput
            label="Default rate (% p.a.)"
            type="number"
            step="0.01"
            value={form.defaultAnnualRate}
            onChange={(defaultAnnualRate) =>
              setForm((f) => ({ ...f, defaultAnnualRate }))
            }
            required
          />
          <FormInput
            label="Weekly rate (% p.a.)"
            type="number"
            step="0.01"
            value={form.annualRateWeekly}
            onChange={(annualRateWeekly) =>
              setForm((f) => ({ ...f, annualRateWeekly }))
            }
          />
          <FormInput
            label="Bi-weekly rate (% p.a.)"
            type="number"
            step="0.01"
            value={form.annualRateBiweekly}
            onChange={(annualRateBiweekly) =>
              setForm((f) => ({ ...f, annualRateBiweekly }))
            }
          />
          <FormInput
            label="Monthly rate (% p.a.)"
            type="number"
            step="0.01"
            value={form.annualRateMonthly}
            onChange={(annualRateMonthly) =>
              setForm((f) => ({ ...f, annualRateMonthly }))
            }
          />
          <FormSelect
            label="Default frequency"
            value={form.defaultFrequency}
            onChange={(defaultFrequency) =>
              setForm((f) => ({ ...f, defaultFrequency }))
            }
            options={[
              { value: "WEEKLY", label: "Weekly" },
              { value: "BIWEEKLY", label: "Bi-Weekly" },
              { value: "MONTHLY", label: "Monthly" },
            ]}
          />
          <FormInput
            label="Default tenure (installments)"
            type="number"
            min={1}
            value={form.defaultTenure}
            onChange={(defaultTenure) =>
              setForm((f) => ({ ...f, defaultTenure }))
            }
            required
          />
          <FormSelect
            label="Default first EMI (monthly)"
            value={form.defaultMonthlyFirstEmi}
            onChange={(defaultMonthlyFirstEmi) =>
              setForm((f) => ({ ...f, defaultMonthlyFirstEmi }))
            }
            options={[
              { value: "EXACT_DAY", label: "Exact day" },
              {
                value: "CONVERT_TO_1ST_PARTIAL",
                label: "Convert to 1st + partial",
              },
              {
                value: "CONVERT_TO_1ST_NEXT_MONTH",
                label: "Convert to 1st next month",
              },
            ]}
          />
          <FormInput
            label="Processing fee (%)"
            type="number"
            step="0.01"
            value={form.processingFeePercent}
            onChange={(processingFeePercent) =>
              setForm((f) => ({ ...f, processingFeePercent }))
            }
          />
          {error ? <FormError>{error}</FormError> : null}
          <div className="lm-actions">
            <Button type="submit" variant="primary" isDisabled={create.isPending}>
              Create product
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate({ to: "/app/products" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

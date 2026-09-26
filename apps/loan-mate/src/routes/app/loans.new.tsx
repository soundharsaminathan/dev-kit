import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormError, FormInput, FormSelect } from "@/modules/ui/form-fields";

type Customer = { id: string; name: string; customerNumber?: string };
type Product = {
  id: string;
  name: string;
  defaultPrincipal?: string | number;
  defaultAnnualRate?: string | number;
  annualRateWeekly?: string | number | null;
  annualRateBiweekly?: string | number | null;
  annualRateMonthly?: string | number | null;
  defaultTenure?: number;
  defaultFrequency?: string;
  defaultMonthlyFirstEmi?: string;
};
type Branch = { id: string; name: string; code: string };

type NewLoanSearch = { customerId?: string };

function num(v: string | number | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  return typeof v === "number" ? v : Number(v);
}

function rateFor(product: Product, frequency: string): number | undefined {
  if (frequency === "WEEKLY") {
    return num(product.annualRateWeekly) ?? num(product.defaultAnnualRate);
  }
  if (frequency === "BIWEEKLY") {
    return num(product.annualRateBiweekly) ?? num(product.defaultAnnualRate);
  }
  return num(product.annualRateMonthly) ?? num(product.defaultAnnualRate);
}

export const Route = createFileRoute("/app/loans/new")({
  validateSearch: (search: Record<string, unknown>): NewLoanSearch => {
    const next: NewLoanSearch = {};
    if (typeof search.customerId === "string") {
      next.customerId = search.customerId;
    }
    return next;
  },
  component: NewLoanPage,
});

function NewLoanPage() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const { customerId: presetCustomerId } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: presetCustomerId ?? "",
    productId: "",
    branchId: user?.branchId ?? "",
    principal: "",
    annualRatePercent: "",
    tenureInstallments: "",
    frequency: "MONTHLY",
    monthlyFirstEmiOption: "EXACT_DAY",
  });

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/customers"),
  });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });
  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/loans", {
        customerId: form.customerId,
        productId: form.productId,
        branchId: form.branchId,
        principal: Number(form.principal),
        annualRatePercent: form.annualRatePercent
          ? Number(form.annualRatePercent)
          : undefined,
        tenureInstallments: form.tenureInstallments
          ? Number(form.tenureInstallments)
          : undefined,
        frequency: form.frequency,
        monthlyFirstEmiOption: form.monthlyFirstEmiOption,
      }),
    onSuccess: (data) => {
      void navigate({
        to: "/app/loans/$id/schedule",
        params: { id: data.id },
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create loan");
    },
  });

  function onProductChange(productId: string) {
    const product = products.data?.find((p) => p.id === productId);
    if (!product) {
      setForm((f) => ({ ...f, productId }));
      return;
    }
    const frequency = product.defaultFrequency ?? "MONTHLY";
    setForm((f) => ({
      ...f,
      productId,
      principal:
        product.defaultPrincipal != null
          ? String(product.defaultPrincipal)
          : f.principal,
      annualRatePercent: String(rateFor(product, frequency) ?? ""),
      tenureInstallments:
        product.defaultTenure != null
          ? String(product.defaultTenure)
          : f.tenureInstallments,
      frequency,
      monthlyFirstEmiOption:
        product.defaultMonthlyFirstEmi ?? f.monthlyFirstEmiOption,
    }));
  }

  function onFrequencyChange(frequency: string) {
    const product = products.data?.find((p) => p.id === form.productId);
    setForm((f) => ({
      ...f,
      frequency,
      annualRatePercent: product
        ? String(rateFor(product, frequency) ?? f.annualRatePercent)
        : f.annualRatePercent,
    }));
  }

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>New loan</h1>
          <p>Product defaults can be overridden (may require approval).</p>
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
          <FormSelect
            label="Customer"
            placeholder="Select customer"
            value={form.customerId}
            onChange={(customerId) => setForm((f) => ({ ...f, customerId }))}
            required
            options={(customers.data ?? []).map((c) => ({
              value: c.id,
              label: c.customerNumber
                ? `${c.name} (${c.customerNumber})`
                : c.name,
            }))}
          />
          <FormSelect
            label="Branch"
            placeholder="Select branch"
            value={form.branchId}
            onChange={(branchId) => setForm((f) => ({ ...f, branchId }))}
            required
            options={(branches.data ?? []).map((b) => ({
              value: b.id,
              label: `${b.name} (${b.code})`,
            }))}
          />
          <FormSelect
            label="Product"
            placeholder="Select product"
            value={form.productId}
            onChange={onProductChange}
            required
            options={(products.data ?? []).map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          <FormInput
            label="Principal"
            type="number"
            min={1}
            value={form.principal}
            onChange={(principal) => setForm((f) => ({ ...f, principal }))}
            required
          />
          <FormInput
            label="Interest rate (% p.a.)"
            type="number"
            step="0.01"
            value={form.annualRatePercent}
            onChange={(annualRatePercent) =>
              setForm((f) => ({ ...f, annualRatePercent }))
            }
          />
          <FormInput
            label="Tenure (installments)"
            type="number"
            min={1}
            value={form.tenureInstallments}
            onChange={(tenureInstallments) =>
              setForm((f) => ({ ...f, tenureInstallments }))
            }
          />
          <FormSelect
            label="Frequency"
            value={form.frequency}
            onChange={onFrequencyChange}
            options={[
              { value: "WEEKLY", label: "Weekly" },
              { value: "BIWEEKLY", label: "Bi-Weekly" },
              { value: "MONTHLY", label: "Monthly" },
            ]}
          />
          <FormSelect
            label="First EMI option (monthly)"
            value={form.monthlyFirstEmiOption}
            onChange={(monthlyFirstEmiOption) =>
              setForm((f) => ({ ...f, monthlyFirstEmiOption }))
            }
            options={[
              { value: "EXACT_DAY", label: "Exact day" },
              {
                value: "CONVERT_TO_1ST_PARTIAL",
                label: "Convert to 1st + partial from disbursement",
              },
              {
                value: "CONVERT_TO_1ST_NEXT_MONTH",
                label: "Convert to 1st next month",
              },
            ]}
          />
          {error ? <FormError>{error}</FormError> : null}
          <div className="lm-actions">
            <Button
              type="submit"
              variant="primary"
              isDisabled={create.isPending}
            >
              Create loan
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate({ to: "/app/loans" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

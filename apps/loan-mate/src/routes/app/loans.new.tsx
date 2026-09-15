import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

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
      void navigate({ to: "/app/loans/$id", params: { id: data.id } });
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
          <div className="lm-form-row">
            <label htmlFor="customerId">Customer</label>
            <select
              id="customerId"
              value={form.customerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerId: e.target.value }))
              }
              required
            >
              <option value="">Select customer</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.customerNumber ? ` (${c.customerNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="branchId">Branch</label>
            <select
              id="branchId"
              value={form.branchId}
              onChange={(e) =>
                setForm((f) => ({ ...f, branchId: e.target.value }))
              }
              required
            >
              <option value="">Select branch</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="productId">Product</label>
            <select
              id="productId"
              value={form.productId}
              onChange={(e) => onProductChange(e.target.value)}
              required
            >
              <option value="">Select product</option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="principal">Principal</label>
            <input
              id="principal"
              type="number"
              min={1}
              value={form.principal}
              onChange={(e) =>
                setForm((f) => ({ ...f, principal: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="annualRatePercent">Interest rate (% p.a.)</label>
            <input
              id="annualRatePercent"
              type="number"
              step="0.01"
              value={form.annualRatePercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, annualRatePercent: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="tenure">Tenure (installments)</label>
            <input
              id="tenure"
              type="number"
              min={1}
              value={form.tenureInstallments}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tenureInstallments: e.target.value,
                }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              value={form.frequency}
              onChange={(e) => onFrequencyChange(e.target.value)}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <div className="lm-form-row">
            <label htmlFor="firstEmi">First EMI option (monthly)</label>
            <select
              id="firstEmi"
              value={form.monthlyFirstEmiOption}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  monthlyFirstEmiOption: e.target.value,
                }))
              }
            >
              <option value="EXACT_DAY">Exact day</option>
              <option value="CONVERT_TO_1ST_PARTIAL">
                Convert to 1st + partial from disbursement
              </option>
              <option value="CONVERT_TO_1ST_NEXT_MONTH">
                Convert to 1st next month
              </option>
            </select>
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          <div className="lm-actions">
            <button type="submit" className="lm-btn" disabled={create.isPending}>
              Create loan
            </button>
            <button
              type="button"
              className="lm-btn lm-btn-secondary"
              onClick={() => void navigate({ to: "/app/loans" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  code: string;
  defaultPrincipal: string | number;
  defaultAnnualRate: string | number;
  defaultFrequency: string;
  defaultTenure: number;
  defaultMonthlyFirstEmi?: string;
  processingFeePercent?: string | number;
  active: boolean;
};

export const Route = createFileRoute("/app/products/$id")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    defaultPrincipal: "",
    defaultAnnualRate: "",
    defaultTenure: "",
    defaultFrequency: "MONTHLY",
    defaultMonthlyFirstEmi: "EXACT_DAY",
    processingFeePercent: "",
    active: true,
  });

  const product = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const all = await api.get<Product[]>("/products");
      const found = all.find((p) => p.id === id);
      if (!found) throw new Error("Product not found");
      return found;
    },
  });

  useEffect(() => {
    if (!product.data) return;
    const p = product.data;
    setForm({
      name: p.name,
      defaultPrincipal: String(p.defaultPrincipal),
      defaultAnnualRate: String(p.defaultAnnualRate),
      defaultTenure: String(p.defaultTenure),
      defaultFrequency: p.defaultFrequency,
      defaultMonthlyFirstEmi: p.defaultMonthlyFirstEmi ?? "EXACT_DAY",
      processingFeePercent: String(p.processingFeePercent ?? 0),
      active: p.active !== false,
    });
  }, [product.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/products/${id}`, {
        name: form.name.trim(),
        defaultPrincipal: Number(form.defaultPrincipal),
        defaultAnnualRate: Number(form.defaultAnnualRate),
        defaultTenure: Number(form.defaultTenure),
        defaultFrequency: form.defaultFrequency,
        defaultMonthlyFirstEmi: form.defaultMonthlyFirstEmi,
        processingFeePercent: Number(form.processingFeePercent),
        active: form.active,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      void navigate({ to: "/app/products" });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Save failed");
    },
  });

  if (product.isLoading) return <p>Loading…</p>;
  if (product.isError || !product.data) {
    return (
      <p className="lm-error">
        {(product.error as Error)?.message ?? "Product not found"}
      </p>
    );
  }

  const p = product.data;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Edit product</h1>
          <p>
            {p.code} · {p.name}
          </p>
        </div>
        <Link to="/app/products" className="lm-btn lm-btn-secondary">
          Back
        </Link>
      </div>

      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
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
            <label htmlFor="rate">Default rate (% p.a.)</label>
            <input
              id="rate"
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
            <label htmlFor="tenure">Default tenure</label>
            <input
              id="tenure"
              type="number"
              min={1}
              value={form.defaultTenure}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultTenure: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="frequency">Frequency</label>
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
            <label htmlFor="firstEmi">First EMI (monthly)</label>
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
          <div className="lm-form-row">
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />{" "}
              Active
            </label>
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          <button type="submit" className="lm-btn" disabled={save.isPending}>
            Save product
          </button>
        </form>
      </div>
    </div>
  );
}

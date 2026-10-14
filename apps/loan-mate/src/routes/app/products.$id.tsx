import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormCheckbox, FormError, FormInput, FormSelect } from "@/modules/ui/form-fields";

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
      <FormError>
        {(product.error as Error)?.message ?? "Product not found"}
      </FormError>
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
        <Button as={Link} to="/app/products" variant="outline">
          Back
        </Button>
      </div>

      <div className="lm-card">
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <FormInput
            label="Name"
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
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
            label="Default tenure"
            type="number"
            min={1}
            value={form.defaultTenure}
            onChange={(defaultTenure) =>
              setForm((f) => ({ ...f, defaultTenure }))
            }
            required
          />
          <FormSelect
            label="Frequency"
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
          <FormSelect
            label="First EMI (monthly)"
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
          <FormCheckbox
            label="Active"
            isSelected={form.active}
            onChange={(active) => setForm((f) => ({ ...f, active }))}
          />
          {error ? <FormError>{error}</FormError> : null}
          <Button type="submit" variant="primary" isDisabled={save.isPending}>
            Save product
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/customers/new")({
  component: NewCustomerPage,
});

function NewCustomerPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    pan: "",
    address: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/customers", {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        pan: form.pan.trim().toUpperCase(),
        address: form.address.trim() || undefined,
      }),
    onSuccess: (data) => {
      void navigate({ to: "/app/customers/$id", params: { id: data.id } });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>New customer</h1>
          <p>Basic KYC — name, mobile, PAN, address.</p>
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
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="mobile">Mobile</label>
            <input
              id="mobile"
              value={form.mobile}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobile: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="pan">PAN</label>
            <input
              id="pan"
              value={form.pan}
              onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              rows={3}
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          <div className="lm-actions">
            <button type="submit" className="lm-btn" disabled={create.isPending}>
              Create customer
            </button>
            <button
              type="button"
              className="lm-btn lm-btn-secondary"
              onClick={() => void navigate({ to: "/app/customers" })}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

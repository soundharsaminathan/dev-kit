import { Button } from "@dev-ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AreaControl, FormError, TextControl } from "@/modules/ui/controls";

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
          <TextControl
            label="Full name"
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
            isRequired
          />
          <TextControl
            label="Mobile"
            value={form.mobile}
            onChange={(mobile) => setForm((f) => ({ ...f, mobile }))}
            isRequired
          />
          <TextControl
            label="PAN"
            value={form.pan}
            onChange={(pan) => setForm((f) => ({ ...f, pan }))}
            isRequired
          />
          <AreaControl
            label="Address"
            rows={3}
            value={form.address}
            onChange={(address) => setForm((f) => ({ ...f, address }))}
          />
          {error ? <FormError>{error}</FormError> : null}
          <div className="lm-actions">
            <Button type="submit" variant="primary" isDisabled={create.isPending}>
              Create customer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate({ to: "/app/customers" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

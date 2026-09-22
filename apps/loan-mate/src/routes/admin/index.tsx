import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormInput, FormPassword } from "@/modules/ui/form-fields";

type Company = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
};

export const Route = createFileRoute("/admin/")({
  component: AdminCompaniesPage,
});

function AdminCompaniesPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "password",
  });
  const [error, setError] = useState<string | null>(null);

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.get<Company[]>("/companies"),
  });

  const createCompany = useMutation({
    mutationFn: () =>
      api.post<Company>("/companies", {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerPassword: form.ownerPassword,
      }),
    onSuccess: async () => {
      setForm({
        name: "",
        slug: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "password",
      });
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create company");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Companies</h1>
          <p>Create and manage NBFC companies on the platform.</p>
        </div>
      </div>

      <div className="lm-card">
        <h2>Create company</h2>
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            createCompany.mutate();
          }}
        >
          <FormInput
            label="Name"
            value={form.name}
            onChange={(name) => setForm((f) => ({ ...f, name }))}
            required
          />
          <FormInput
            label="Slug"
            value={form.slug}
            onChange={(slug) => setForm((f) => ({ ...f, slug }))}
            pattern="[a-z0-9-]+"
            required
          />
          <FormInput
            label="Owner name"
            value={form.ownerName}
            onChange={(ownerName) => setForm((f) => ({ ...f, ownerName }))}
            required
          />
          <FormInput
            label="Owner email"
            type="email"
            value={form.ownerEmail}
            onChange={(ownerEmail) => setForm((f) => ({ ...f, ownerEmail }))}
            required
          />
          <FormPassword
            label="Owner password"
            value={form.ownerPassword}
            onChange={(ownerPassword) =>
              setForm((f) => ({ ...f, ownerPassword }))
            }
            autoComplete="new-password"
            required
          />
          {error ? <p className="lm-error">{error}</p> : null}
          <Button
            type="submit"
            variant="primary"
            isDisabled={createCompany.isPending}
          >
            Create company
          </Button>
        </form>
      </div>

      <div className="lm-card lm-table-wrap">
        {companies.isLoading ? <p>Loading…</p> : null}
        {companies.isError ? (
          <p className="lm-error">
            {(companies.error as Error).message || "Failed to load companies"}
          </p>
        ) : null}
        {companies.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Id</th>
              </tr>
            </thead>
            <tbody>
              {companies.data.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.slug}</td>
                  <td>
                    <code>{c.id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

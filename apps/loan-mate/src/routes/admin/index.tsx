import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

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
          <div className="lm-form-row">
            <label htmlFor="company-name">Name</label>
            <input
              id="company-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="company-slug">Slug</label>
            <input
              id="company-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              pattern="[a-z0-9-]+"
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="owner-name">Owner name</label>
            <input
              id="owner-name"
              value={form.ownerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerName: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="owner-email">Owner email</label>
            <input
              id="owner-email"
              type="email"
              value={form.ownerEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerEmail: e.target.value }))
              }
              required
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="owner-password">Owner password</label>
            <input
              id="owner-password"
              type="password"
              value={form.ownerPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerPassword: e.target.value }))
              }
              required
            />
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          <button
            type="submit"
            className="lm-btn"
            disabled={createCompany.isPending}
          >
            Create company
          </button>
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

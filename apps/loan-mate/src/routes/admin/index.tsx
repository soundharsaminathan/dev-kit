import { Button } from "@dev-ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dev-ui/components/card";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormError } from "@/modules/ui/controls";
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
          {error ? <FormError>{error}</FormError> : null}
          <Button
            type="submit"
            variant="primary"
            isDisabled={createCompany.isPending}
          >
            Create company
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
        </CardHeader>
        <CardContent>
        {companies.isLoading ? <Skeleton /> : null}
        {companies.isError ? (
          <FormError>
            {(companies.error as Error).message || "Failed to load companies"}
          </FormError>
        ) : null}
        {companies.data ? (
          <Table<Company> aria-label="Companies" items={companies.data}>
            <TableHeader>
              <TableColumn id="name" isRowHeader>
                Name
              </TableColumn>
              <TableColumn id="slug">Slug</TableColumn>
              <TableColumn id="id">Id</TableColumn>
            </TableHeader>
            <TableBody<Company>>
              {(company) => (
                <TableRow>
                  {(column) => (
                    <TableCell>
                      {column.id === "name" ? company.name : null}
                      {column.id === "slug" ? company.slug : null}
                      {column.id === "id" ? <code>{company.id}</code> : null}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

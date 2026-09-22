import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";
import { FormInput, FormSelect } from "@/modules/ui/form-fields";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string | null;
  active: boolean;
};

type Branch = { id: string; name: string; code: string };

type Performance = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  active: boolean;
  from: string;
  to: string;
  leadsGenerated: number;
  assignedCustomers: number;
  assignedOutstanding: number;
  collectedAmount: number;
  collectedCount: number;
  recordedAmount: number;
  recordedCount: number;
};

type CustomerRow = {
  id: string;
  customerNumber?: string;
  name: string;
  mobile: string;
  collectionOfficerId?: string | null;
  collectionOfficer?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
};

const MANAGER_ROLES: UserRole[] = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
];

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const Route = createFileRoute("/app/users/$id")({
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = Route.useParams();
  const { api, user } = useAuth();
  const queryClient = useQueryClient();
  const canAssign = user ? MANAGER_ROLES.includes(user.role) : false;
  const defaults = useMemo(() => monthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [assignCustomerId, setAssignCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const employee = useQuery({
    queryKey: ["users", id],
    queryFn: () => api.get<UserRow>(`/users/${id}`),
  });

  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const performance = useQuery({
    queryKey: ["users", id, "performance", from, to],
    queryFn: () =>
      api.get<Performance>(
        `/users/${id}/performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
  });

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<CustomerRow[]>("/customers"),
    enabled: canAssign,
  });

  const assigned = (customers.data ?? []).filter(
    (c) => c.collectionOfficerId === id,
  );
  const assignable = (customers.data ?? []).filter(
    (c) => c.collectionOfficerId !== id,
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users", id] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({
      queryKey: ["users", id, "performance"],
    });
  };

  const assign = useMutation({
    mutationFn: (customerId: string) =>
      api.patch(`/customers/${customerId}/assignment`, {
        collectionOfficerId: id,
      }),
    onSuccess: async () => {
      setError(null);
      setSuccess("Customer assigned.");
      setAssignCustomerId("");
      await invalidate();
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Assign failed");
    },
  });

  const unassign = useMutation({
    mutationFn: (customerId: string) =>
      api.patch(`/customers/${customerId}/assignment`, {
        collectionOfficerId: null,
      }),
    onSuccess: async () => {
      setError(null);
      setSuccess("Customer unassigned.");
      await invalidate();
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Unassign failed");
    },
  });

  if (employee.isLoading) return <p>Loading…</p>;
  if (employee.isError || !employee.data) {
    return (
      <p className="lm-error">
        {(employee.error as Error)?.message ?? "Employee not found"}
      </p>
    );
  }

  const e = employee.data;
  const branchCode =
    branches.data?.find((b) => b.id === e.branchId)?.code ?? "—";
  const metrics = performance.data;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <p className="lm-muted" style={{ margin: 0 }}>
            <Link to="/app/users">Employees</Link>
          </p>
          <h1>{e.name}</h1>
          <p>
            {e.email} · {e.role.replaceAll("_", " ")} · {branchCode} ·{" "}
            {e.active ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}
      {success ? <p style={{ color: "var(--lm-success)" }}>{success}</p> : null}

      <div className="lm-card">
        <div className="lm-page-header" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Performance</h2>
          <div className="lm-actions">
            <FormInput label="From" type="date" value={from} onChange={setFrom} />
            <FormInput label="To" type="date" value={to} onChange={setTo} />
          </div>
        </div>
        {performance.isLoading ? <p>Loading…</p> : null}
        {performance.isError ? (
          <p className="lm-error">{(performance.error as Error).message}</p>
        ) : null}
        {metrics ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
              gap: "1rem",
            }}
          >
            <MetricCard label="Leads generated" value={metrics.leadsGenerated} />
            <MetricCard
              label="Assigned customers"
              value={metrics.assignedCustomers}
            />
            <MetricCard
              label="Assigned outstanding"
              value={metrics.assignedOutstanding}
            />
            <MetricCard
              label="Collected (assigned)"
              value={metrics.collectedAmount}
              hint={`${metrics.collectedCount} payments`}
            />
            <MetricCard
              label="Recorded by employee"
              value={metrics.recordedAmount}
              hint={`${metrics.recordedCount} payments`}
            />
          </div>
        ) : null}
      </div>

      {canAssign ? (
        <div className="lm-card">
          <h2>Collection targets</h2>
          <p className="lm-muted">
            Assign customers to this employee as their collection queue.
          </p>
          <form
            className="lm-form"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!assignCustomerId) return;
              assign.mutate(assignCustomerId);
            }}
          >
            <FormSelect
              label="Customer"
              placeholder="Select customer"
              value={assignCustomerId}
              onChange={setAssignCustomerId}
              required
              options={assignable.map((c) => ({
                value: c.id,
                label: `${c.customerNumber ?? c.id} — ${c.name}${
                  c.collectionOfficer ? ` (now: ${c.collectionOfficer.name})` : ""
                }`,
              }))}
            />
            <Button
              type="submit"
              variant="primary"
              isDisabled={assign.isPending || !assignCustomerId}
            >
              Assign customer
            </Button>
          </form>

          <div className="lm-table-wrap" style={{ marginTop: "1.25rem" }}>
            <h3>Assigned now</h3>
            {assigned.length ? (
              <table className="lm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assigned.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to="/app/customers/$id" params={{ id: c.id }}>
                          {c.customerNumber ?? c.name}
                        </Link>
                      </td>
                      <td>{c.mobile}</td>
                      <td>
                        <Button
                          type="button"
                          variant="outline"
                          isDisabled={unassign.isPending}
                          onClick={() => unassign.mutate(c.id)}
                        >
                          Unassign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="lm-muted">No customers assigned.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--lm-border, #ddd)",
        borderRadius: "0.5rem",
        padding: "0.75rem 1rem",
      }}
    >
      <div className="lm-muted" style={{ fontSize: "0.85rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{value}</div>
      {hint ? (
        <div className="lm-muted" style={{ fontSize: "0.8rem" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

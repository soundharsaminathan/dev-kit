import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  homePathForUser,
  isAuthBypassEnabled,
  STAFF_ROLES,
  type UserRole,
} from "@/lib/constants";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string | null;
  active: boolean;
};

type Branch = { id: string; name: string; code: string };

const CAN_MANAGE: UserRole[] = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "SYSTEM_ADMIN",
];

export const Route = createFileRoute("/app/users/")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { api, user, loginAs } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = user ? CAN_MANAGE.includes(user.role) : false;
  const canLoginAs = isAuthBypassEnabled();
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "LOAN_OFFICER" as UserRole,
    branchId: "",
  });

  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserRow[]>("/users"),
  });
  const showActions =
    canManage ||
    (canLoginAs && (users.data ?? []).some((row) => row.id !== user?.id));

  const branches = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branches"),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createUser = useMutation({
    mutationFn: () =>
      api.post("/users", {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        branchId: createForm.branchId || undefined,
      }),
    onSuccess: async () => {
      setError(null);
      setSuccess("Employee created.");
      setCreateForm({
        name: "",
        email: "",
        role: "LOAN_OFFICER",
        branchId: "",
      });
      await invalidate();
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Create failed");
    },
  });

  async function loginAsEmployee(employee: UserRow) {
    setError(null);
    setSuccess(null);
    setLoggingInAs(employee.id);
    try {
      const next = await loginAs(employee.id);
      queryClient.clear();
      await navigate({ to: homePathForUser(next.role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login as failed");
    } finally {
      setLoggingInAs(null);
    }
  }

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/users/${id}`, { active }),
    onSuccess: invalidate,
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Employees</h1>
          <p>Company staff — roles, branch, and performance.</p>
        </div>
      </div>

      {canManage ? (
        <div className="lm-card">
          <h2>New employee</h2>
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
          >
            <div className="lm-form-row">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="lm-form-row">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                  }))
                }
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="lm-form-row">
              <label htmlFor="branchId">Branch</label>
              <select
                id="branchId"
                value={createForm.branchId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, branchId: e.target.value }))
                }
              >
                <option value="">—</option>
                {(branches.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="lm-error">{error}</p> : null}
            {success ? (
              <p style={{ color: "var(--lm-success)" }}>{success}</p>
            ) : null}
            <button
              type="submit"
              className="lm-btn"
              disabled={createUser.isPending}
            >
              Create employee
            </button>
          </form>
        </div>
      ) : null}

      <div className="lm-card lm-table-wrap">
        <h2>Staff</h2>
        {users.isLoading ? <p>Loading…</p> : null}
        {users.isError ? (
          <p className="lm-error">{(users.error as Error).message}</p>
        ) : null}
        {users.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Active</th>
                {showActions ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to="/app/users/$id" params={{ id: u.id }}>
                      {u.name}
                    </Link>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role.replaceAll("_", " ")}</td>
                  <td>
                    {branches.data?.find((b) => b.id === u.branchId)?.code ??
                      "—"}
                  </td>
                  <td>{u.active ? "Yes" : "No"}</td>
                  {showActions ? (
                    <td>
                      <div className="lm-actions">
                        {canLoginAs && u.id !== user?.id ? (
                          <button
                            type="button"
                            className="lm-btn lm-btn-secondary"
                            disabled={!u.active || loggingInAs !== null}
                            onClick={() => void loginAsEmployee(u)}
                          >
                            {loggingInAs === u.id ? "Signing in…" : "Login as"}
                          </button>
                        ) : null}
                        {canManage ? (
                          <button
                            type="button"
                            className={
                              u.active ? "lm-btn lm-btn-secondary" : "lm-btn"
                            }
                            disabled={toggleActive.isPending}
                            onClick={() =>
                              toggleActive.mutate({
                                id: u.id,
                                active: !u.active,
                              })
                            }
                          >
                            {u.active ? "Deactivate" : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

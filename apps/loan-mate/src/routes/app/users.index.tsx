import { Badge } from "@dev-ui/components/badge";
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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  homePathForUser,
  isAuthBypassEnabled,
  STAFF_ROLES,
  type UserRole,
} from "@/lib/constants";
import { FormInput, FormSelect } from "@/modules/ui/form-fields";
import { FormError, FormSuccess } from "@/modules/ui/controls";

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
            <FormInput
              label="Name"
              value={createForm.name}
              onChange={(name) => setCreateForm((f) => ({ ...f, name }))}
              required
            />
            <FormInput
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(email) => setCreateForm((f) => ({ ...f, email }))}
              required
            />
            <FormSelect
              label="Role"
              value={createForm.role}
              onChange={(role) =>
                setCreateForm((f) => ({ ...f, role: role as UserRole }))
              }
              options={STAFF_ROLES.map((role) => ({
                value: role,
                label: role.replaceAll("_", " "),
              }))}
            />
            <FormSelect
              label="Branch"
              placeholder="No branch"
              value={createForm.branchId}
              onChange={(branchId) => setCreateForm((f) => ({ ...f, branchId }))}
              options={(branches.data ?? []).map((b) => ({
                value: b.id,
                label: `${b.code} — ${b.name}`,
              }))}
            />
            {error ? <FormError>{error}</FormError> : null}
            {success ? (
              <FormSuccess>{success}</FormSuccess>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              isDisabled={createUser.isPending}
            >
              Create employee
            </Button>
          </form>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardContent>
        {users.isLoading ? <Skeleton /> : null}
        {users.isError ? (
          <FormError>{(users.error as Error).message}</FormError>
        ) : null}
        {users.data ? (
          <Table<UserRow> aria-label="Staff" items={users.data}>
            <TableHeader>
              <TableColumn id="name" isRowHeader>
                Name
              </TableColumn>
              <TableColumn id="email">Email</TableColumn>
              <TableColumn id="role">Role</TableColumn>
              <TableColumn id="branch">Branch</TableColumn>
              <TableColumn id="active">Active</TableColumn>
              {showActions ? <TableColumn id="actions">Actions</TableColumn> : null}
            </TableHeader>
            <TableBody<UserRow>>
              {(employee) => (
                <TableRow>
                  {(column) => (
                    <TableCell>
                      {column.id === "name" ? (
                        <Link to="/app/users/$id" params={{ id: employee.id }}>
                          {employee.name}
                        </Link>
                      ) : null}
                      {column.id === "email" ? employee.email : null}
                      {column.id === "role"
                        ? employee.role.replaceAll("_", " ")
                        : null}
                      {column.id === "branch"
                        ? (branches.data?.find((b) => b.id === employee.branchId)
                            ?.code ?? "—")
                        : null}
                      {column.id === "active" ? (
                        <Badge
                          appearance="subtle"
                          variant={employee.active ? "success" : "neutral"}
                        >
                          {employee.active ? "Yes" : "No"}
                        </Badge>
                      ) : null}
                      {column.id === "actions" && showActions ? (
                        <div className="lm-actions">
                          {canLoginAs && employee.id !== user?.id ? (
                            <Button
                              type="button"
                              variant="outline"
                              isDisabled={!employee.active || loggingInAs !== null}
                              onClick={() => void loginAsEmployee(employee)}
                            >
                              {loggingInAs === employee.id
                                ? "Signing in…"
                                : "Login as"}
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              type="button"
                              variant={employee.active ? "outline" : "primary"}
                              isDisabled={toggleActive.isPending}
                              onClick={() =>
                                toggleActive.mutate({
                                  id: employee.id,
                                  active: !employee.active,
                                })
                              }
                            >
                              {employee.active ? "Deactivate" : "Activate"}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
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

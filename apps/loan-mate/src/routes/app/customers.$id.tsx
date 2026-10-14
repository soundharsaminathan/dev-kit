import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/constants";
import { DocumentsPanel } from "@/lib/documents-panel";
import { FormError, FormInput, FormSelect, FormSuccess, FormTextArea } from "@/modules/ui/form-fields";

type StaffRef = { id: string; name: string; role?: UserRole };

type Customer = {
  id: string;
  customerNumber?: string;
  name: string;
  mobile: string;
  pan?: string;
  address?: string;
  branchId?: string;
  blacklistReason?: string | null;
  blacklisted?: boolean;
  npa?: boolean;
  npaReason?: string | null;
  createdById?: string | null;
  collectionOfficerId?: string | null;
  createdBy?: StaffRef | null;
  collectionOfficer?: StaffRef | null;
};

type Loan = {
  id: string;
  loanNumber?: string;
  status: string;
  principal?: number;
};

type UserRow = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

const MANAGER_ROLES: UserRole[] = [
  "COMPANY_OWNER",
  "COMPANY_ADMIN",
  "BRANCH_MANAGER",
];

export const Route = createFileRoute("/app/customers/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const queryClient = useQueryClient();
  const canAssign = user ? MANAGER_ROLES.includes(user.role) : false;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    pan: "",
    address: "",
  });
  const [officerId, setOfficerId] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");
  const [npaReason, setNpaReason] = useState("");
  const [npaClearReason, setNpaClearReason] = useState("");

  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
  });

  const loans = useQuery({
    queryKey: ["loans", { customerId: id }],
    queryFn: () => api.get<Loan[]>(`/loans?customerId=${id}`),
  });

  const officers = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: () => api.get<UserRow[]>("/users"),
    enabled: canAssign,
  });

  useEffect(() => {
    if (!customer.data) return;
    setEditForm({
      name: customer.data.name,
      mobile: customer.data.mobile,
      pan: customer.data.pan ?? "",
      address: customer.data.address ?? "",
    });
    setOfficerId(customer.data.collectionOfficerId ?? "");
  }, [customer.data]);

  const invalidate = async () => {
    setError(null);
    await queryClient.invalidateQueries({ queryKey: ["customers", id] });
  };

  const onErr = (err: unknown) => {
    setSuccess(null);
    setError(err instanceof Error ? err.message : "Action failed");
  };

  const saveCustomer = useMutation({
    mutationFn: () => api.patch(`/customers/${id}`, editForm),
    onSuccess: async () => {
      setSuccess("Customer updated.");
      setEditOpen(false);
      await invalidate();
    },
    onError: onErr,
  });

  const saveAssignment = useMutation({
    mutationFn: () =>
      api.patch(`/customers/${id}/assignment`, {
        collectionOfficerId: officerId || null,
      }),
    onSuccess: async () => {
      setSuccess("Collection officer updated.");
      await invalidate();
    },
    onError: onErr,
  });

  const blacklist = useMutation({
    mutationFn: (blacklisted: boolean) =>
      api.post(`/customers/${id}/blacklist`, {
        blacklisted,
        reason: blacklistReason.trim() || undefined,
      }),
    onSuccess: async (_data, blacklisted) => {
      setSuccess(blacklisted ? "Blacklisted." : "Removed from blacklist.");
      setBlacklistReason("");
      await invalidate();
    },
    onError: onErr,
  });

  const requestNpaMark = useMutation({
    mutationFn: () =>
      api.post(`/customers/${id}/request-npa-mark`, {
        reason: npaReason.trim(),
      }),
    onSuccess: async () => {
      setSuccess("NPA mark submitted for approval.");
      setNpaReason("");
      await invalidate();
    },
    onError: onErr,
  });

  const requestNpaClear = useMutation({
    mutationFn: () =>
      api.post(`/customers/${id}/request-npa-clear`, {
        reason: npaClearReason.trim() || undefined,
      }),
    onSuccess: async () => {
      setSuccess("NPA clear submitted for approval.");
      setNpaClearReason("");
      await invalidate();
    },
    onError: onErr,
  });

  if (customer.isLoading) return <p>Loading…</p>;
  if (customer.isError || !customer.data) {
    return (
      <FormError>
        {(customer.error as Error)?.message ?? "Customer not found"}
      </FormError>
    );
  }

  const c = customer.data;
  const assignableOfficers = (officers.data ?? []).filter(
    (u) =>
      u.active &&
      (u.role === "COLLECTION_OFFICER" || u.role === "BRANCH_MANAGER"),
  );

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.customerNumber ?? c.id} · {c.mobile}
          </p>
          <div className="lm-actions" style={{ marginTop: "0.5rem" }}>
            {c.blacklisted ? (
              <Badge variant="danger" appearance="subtle">Blacklisted</Badge>
            ) : null}
            {c.npa ? (
              <Badge variant="warning" appearance="subtle">
                NPA
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() =>
            void navigate({
              to: "/app/loans/new",
              search: { customerId: c.id },
            })
          }
        >
          <Icon name="plus" />
          New loan
        </Button>
      </div>

      {error ? <FormError>{error}</FormError> : null}
      {success ? <FormSuccess>{success}</FormSuccess> : null}

      <Tabs aria-label="Customer" defaultSelectedKey="profile">
        <TabList variant="line" className="lm-tab-list">
          <Tab id="profile">Profile</Tab>
          <Tab id="risk">Risk</Tab>
          <Tab id="loans">Loans</Tab>
          <Tab id="documents">Documents</Tab>
        </TabList>
        <TabPanel id="profile">
      <div className="lm-card">
        <div className="lm-page-header" style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Profile</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditOpen((v) => !v)}
          >
            <Icon name={editOpen ? "x" : "edit"} />
            {editOpen ? "Cancel edit" : "Edit"}
          </Button>
        </div>
        {editOpen ? (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveCustomer.mutate();
            }}
          >
            <FormInput
              label="Name"
              value={editForm.name}
              onChange={(name) => setEditForm((f) => ({ ...f, name }))}
              required
            />
            <FormInput
              label="Mobile"
              value={editForm.mobile}
              onChange={(mobile) => setEditForm((f) => ({ ...f, mobile }))}
              required
            />
            <FormInput
              label="PAN"
              value={editForm.pan}
              onChange={(pan) => setEditForm((f) => ({ ...f, pan }))}
            />
            <FormTextArea
              label="Address"
              rows={2}
              value={editForm.address}
              onChange={(address) => setEditForm((f) => ({ ...f, address }))}
            />
            <Button
              type="submit"
              variant="primary"
              isDisabled={saveCustomer.isPending}
            >
              Save
            </Button>
          </form>
        ) : (
          <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
            <div>
              <dt className="lm-muted">PAN</dt>
              <dd style={{ margin: 0 }}>{c.pan ?? "—"}</dd>
            </div>
            <div>
              <dt className="lm-muted">Address</dt>
              <dd style={{ margin: 0 }}>{c.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="lm-muted">Created by</dt>
              <dd style={{ margin: 0 }}>
                {c.createdBy ? (
                  <Link to="/app/users/$id" params={{ id: c.createdBy.id }}>
                    {c.createdBy.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="lm-muted">Collection officer</dt>
              <dd style={{ margin: 0 }}>
                {c.collectionOfficer ? (
                  <Link
                    to="/app/users/$id"
                    params={{ id: c.collectionOfficer.id }}
                  >
                    {c.collectionOfficer.name}
                  </Link>
                ) : (
                  "Unassigned"
                )}
              </dd>
            </div>
            <div>
              <dt className="lm-muted">Status</dt>
              <dd style={{ margin: 0 }}>
                {c.blacklisted ? (
                  <Badge variant="danger" appearance="subtle">
                    Blacklisted
                    {c.blacklistReason ? `: ${c.blacklistReason}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="success" appearance="subtle">
                    Active
                  </Badge>
                )}
                {c.npa ? (
                  <Badge variant="warning" appearance="subtle">
                    NPA{c.npaReason ? `: ${c.npaReason}` : ""}
                  </Badge>
                ) : null}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {canAssign ? (
        <div className="lm-card">
          <h2>Collection assignment</h2>
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveAssignment.mutate();
            }}
          >
            <FormSelect
              label="Collection officer"
              placeholder="Unassigned"
              value={officerId}
              onChange={setOfficerId}
              options={assignableOfficers.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.role.replaceAll("_", " ")})`,
              }))}
            />
            <Button
              type="submit"
              variant="primary"
              isDisabled={saveAssignment.isPending}
            >
              Save assignment
            </Button>
          </form>
        </div>
      ) : null}
        </TabPanel>
        <TabPanel id="risk">
      <div className="lm-card">
        <h2>Blacklist</h2>
        <div className="lm-form">
          <FormInput
            label="Reason"
            value={blacklistReason}
            onChange={setBlacklistReason}
          />
          <div className="lm-actions">
            {!c.blacklisted ? (
              <Button
                type="button"
                variant="danger"
                isDisabled={blacklist.isPending}
                onClick={() => blacklist.mutate(true)}
              >
                Blacklist
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                isDisabled={blacklist.isPending}
                onClick={() => blacklist.mutate(false)}
              >
                Remove blacklist
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="lm-card">
        <h2>NPA</h2>
        <p className="lm-muted">
          Manual customer-level flag — requires approval.
        </p>
        {!c.npa ? (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              requestNpaMark.mutate();
            }}
          >
            <FormInput
              label="Reason"
              value={npaReason}
              onChange={setNpaReason}
              required
            />
            <Button
              type="submit"
              variant="outline"
              isDisabled={requestNpaMark.isPending}
            >
              Request NPA mark
            </Button>
          </form>
        ) : (
          <form
            className="lm-form"
            onSubmit={(e) => {
              e.preventDefault();
              requestNpaClear.mutate();
            }}
          >
            <FormInput
              label="Reason (optional)"
              value={npaClearReason}
              onChange={setNpaClearReason}
            />
            <Button
              type="submit"
              variant="outline"
              isDisabled={requestNpaClear.isPending}
            >
              Request NPA clear
            </Button>
          </form>
        )}
      </div>
        </TabPanel>
        <TabPanel id="documents">
          <DocumentsPanel entityType="CUSTOMER" entityId={c.id} />
        </TabPanel>
        <TabPanel id="loans">
      <div className="lm-card lm-table-wrap">
        <h2>Loans</h2>
        {loans.data?.length ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Status</th>
                <th>Principal</th>
              </tr>
            </thead>
            <tbody>
              {loans.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link to="/app/loans/$id" params={{ id: l.id }}>
                      {l.loanNumber ?? l.id}
                    </Link>
                  </td>
                  <td>
                    <Badge appearance="subtle">{l.status}</Badge>
                  </td>
                  <td>{l.principal ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="lm-muted">No loans yet.</p>
        )}
      </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}

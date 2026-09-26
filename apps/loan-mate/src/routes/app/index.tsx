import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  APPROVAL_PAGE_ROLES,
  COLLECTION_PAGE_ROLES,
  ORIGINATION_ROLES,
  roleAllowed,
} from "@/lib/page-access";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { api, user } = useAuth();

  const customers = useQuery({
    queryKey: ["customers", "count"],
    queryFn: () => api.get<unknown[]>("/customers"),
  });
  const loans = useQuery({
    queryKey: ["loans", "count"],
    queryFn: () => api.get<Array<{ status: string }>>("/loans"),
  });
  const canApprove = roleAllowed(user?.role, APPROVAL_PAGE_ROLES);
  const canOriginate = roleAllowed(user?.role, ORIGINATION_ROLES);
  const canCollect = roleAllowed(user?.role, COLLECTION_PAGE_ROLES);

  const approvals = useQuery({
    queryKey: ["approvals", "pending"],
    enabled: canApprove,
    queryFn: () =>
      api
        .get<unknown[]>("/approvals?status=PENDING")
        .catch(() => api.get<unknown[]>("/approvals")),
  });

  const activeLoans =
    loans.data?.filter((l) =>
      ["DISBURSED", "ACTIVE", "APPROVED"].includes(l.status),
    ).length ?? "—";

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Home</h1>
          <p>
            Welcome back, {user?.name}. Run origination, approvals, and
            collections from here.
          </p>
        </div>
      </div>

      <div className="lm-grid-stats">
        <div className="lm-stat">
          <strong>
            {customers.isLoading ? "…" : (customers.data?.length ?? "—")}
          </strong>
          <span>Customers</span>
        </div>
        <div className="lm-stat">
          <strong>{loans.isLoading ? "…" : activeLoans}</strong>
          <span>Active / disbursed loans</span>
        </div>
        {canApprove ? (
          <div className="lm-stat">
            <strong>
              {approvals.isLoading ? "…" : (approvals.data?.length ?? "—")}
            </strong>
            <span>Pending approvals</span>
          </div>
        ) : null}
      </div>

      <div className="lm-card">
        <h2>Quick links</h2>
        <div className="lm-actions">
          {canOriginate ? (
            <Button as={Link} to="/app/customers/new" variant="primary">
              <Icon name="plus" />
              New customer
            </Button>
          ) : null}
          {canOriginate ? (
            <Button as={Link} to="/app/loans/new" variant="outline">
              <Icon name="wallet" />
              New loan
            </Button>
          ) : null}
          {canCollect ? (
            <Button as={Link} to="/app/collections" variant="outline">
              <Icon name="credit-card" />
              Record payment
            </Button>
          ) : null}
          {canApprove ? (
            <Button as={Link} to="/app/approvals" variant="outline">
              <Icon name="badge-check" />
              Review approvals
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

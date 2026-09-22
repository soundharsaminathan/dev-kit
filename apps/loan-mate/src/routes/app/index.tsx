import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

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
  const approvals = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () =>
      api.get<unknown[]>("/approvals?status=PENDING").catch(() =>
        api.get<unknown[]>("/approvals"),
      ),
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
        <div className="lm-stat">
          <strong>
            {approvals.isLoading ? "…" : (approvals.data?.length ?? "—")}
          </strong>
          <span>Pending approvals</span>
        </div>
      </div>

      <div className="lm-card">
        <h2>Quick links</h2>
        <div className="lm-actions">
          <Button as={Link} to="/app/customers/new" variant="primary">
            <Icon name="plus" />
            New customer
          </Button>
          <Button as={Link} to="/app/loans/new" variant="outline">
            <Icon name="wallet" />
            New loan
          </Button>
          <Button as={Link} to="/app/collections" variant="outline">
            <Icon name="credit-card" />
            Record payment
          </Button>
          <Button as={Link} to="/app/approvals" variant="outline">
            <Icon name="badge-check" />
            Review approvals
          </Button>
        </div>
      </div>
    </div>
  );
}

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
          <Link to="/app/customers/new" className="lm-btn">
            New customer
          </Link>
          <Link to="/app/loans/new" className="lm-btn lm-btn-secondary">
            New loan
          </Link>
          <Link to="/app/collections" className="lm-btn lm-btn-secondary">
            Record payment
          </Link>
          <Link to="/app/approvals" className="lm-btn lm-btn-secondary">
            Review approvals
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

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
};

type Loan = {
  id: string;
  loanNumber?: string;
  status: string;
  principal?: number;
};

export const Route = createFileRoute("/app/customers/$id")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { api } = useAuth();

  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
  });

  const loans = useQuery({
    queryKey: ["loans", { customerId: id }],
    queryFn: () => api.get<Loan[]>(`/loans?customerId=${id}`),
  });

  if (customer.isLoading) return <p>Loading…</p>;
  if (customer.isError || !customer.data) {
    return (
      <p className="lm-error">
        {(customer.error as Error)?.message ?? "Customer not found"}
      </p>
    );
  }

  const c = customer.data;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.customerNumber ?? c.id} · {c.mobile}
          </p>
        </div>
        <Link
          to="/app/loans/new"
          search={{ customerId: c.id }}
          className="lm-btn"
        >
          New loan
        </Link>
      </div>

      <div className="lm-card">
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
            <dt className="lm-muted">Status</dt>
            <dd style={{ margin: 0 }}>
              {c.blacklisted ? (
                <span className="lm-badge">
                  Blacklisted{c.blacklistReason ? `: ${c.blacklistReason}` : ""}
                </span>
              ) : (
                "Active"
              )}
            </dd>
          </div>
        </dl>
      </div>

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
                    <span className="lm-badge">{l.status}</span>
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
    </div>
  );
}

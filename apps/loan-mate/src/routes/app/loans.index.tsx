import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

type Loan = {
  id: string;
  loanNumber: string;
  status: string;
  principal: string | number;
  customer?: { id: string; name: string };
  product?: { id: string; name: string };
};

export const Route = createFileRoute("/app/loans/")({
  component: LoansPage,
});

function LoansPage() {
  const { api } = useAuth();
  const loans = useQuery({
    queryKey: ["loans"],
    queryFn: () => api.get<Loan[]>("/loans"),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Loans</h1>
          <p>Origination through disbursement and active servicing.</p>
        </div>
        <Button as={Link} to="/app/loans/new" variant="primary">
          <Icon name="plus" />
          New loan
        </Button>
      </div>

      <div className="lm-card lm-table-wrap">
        {loans.isLoading ? <p>Loading…</p> : null}
        {loans.isError ? (
          <p className="lm-error">{(loans.error as Error).message}</p>
        ) : null}
        {loans.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Principal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link to="/app/loans/$id" params={{ id: l.id }}>
                      {l.loanNumber}
                    </Link>
                  </td>
                  <td>{l.customer?.name ?? "—"}</td>
                  <td>{l.product?.name ?? "—"}</td>
                  <td>
                    {typeof l.principal === "number"
                      ? l.principal.toLocaleString("en-IN")
                      : l.principal}
                  </td>
                  <td>
                    <span className="lm-badge">{l.status}</span>
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

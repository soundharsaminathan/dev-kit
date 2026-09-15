import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

type Customer = {
  id: string;
  customerNumber?: string;
  name: string;
  mobile: string;
  pan?: string;
  branchId?: string;
  blacklisted?: boolean;
};

export const Route = createFileRoute("/app/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const { api } = useAuth();
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<Customer[]>("/customers"),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Customers</h1>
          <p>Company customers — mobile and PAN unique within company.</p>
        </div>
        <Link to="/app/customers/new" className="lm-btn">
          New customer
        </Link>
      </div>

      <div className="lm-card lm-table-wrap">
        {customers.isLoading ? <p>Loading…</p> : null}
        {customers.isError ? (
          <p className="lm-error">{(customers.error as Error).message}</p>
        ) : null}
        {customers.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>PAN</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to="/app/customers/$id" params={{ id: c.id }}>
                      {c.customerNumber ?? c.id}
                    </Link>
                  </td>
                  <td>{c.name}</td>
                  <td>{c.mobile}</td>
                  <td>{c.pan ?? "—"}</td>
                  <td>
                    {c.blacklisted ? (
                      <span className="lm-badge">Blacklisted</span>
                    ) : (
                      "Active"
                    )}
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

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

type Product = {
  id: string;
  name: string;
  code: string;
  defaultAnnualRate: string | number;
  defaultFrequency: string;
  defaultTenure: number;
  active: boolean;
};

export const Route = createFileRoute("/app/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const { api } = useAuth();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<Product[]>("/products"),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Products</h1>
          <p>Configurable loan products — defaults confirmed at origination.</p>
        </div>
        <Link to="/app/products/new" className="lm-btn">
          New product
        </Link>
      </div>

      <div className="lm-card lm-table-wrap">
        {products.isLoading ? <p>Loading…</p> : null}
        {products.isError ? (
          <p className="lm-error">{(products.error as Error).message}</p>
        ) : null}
        {products.data ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Rate</th>
                <th>Frequency</th>
                <th>Tenure</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to="/app/products/$id" params={{ id: p.id }}>
                      {p.name}
                    </Link>
                  </td>
                  <td>{p.code}</td>
                  <td>{String(p.defaultAnnualRate)}%</td>
                  <td>{p.defaultFrequency}</td>
                  <td>{p.defaultTenure}</td>
                  <td>{p.active === false ? "No" : "Yes"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

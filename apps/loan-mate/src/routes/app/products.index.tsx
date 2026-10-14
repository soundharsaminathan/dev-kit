import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dev-ui/components/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@dev-ui/components/empty";
import { Heading } from "@dev-ui/components/heading";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { FormError } from "@/modules/ui/controls";

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
          <Heading level={1}>Products</Heading>
          <p>Configurable loan products — defaults confirmed at origination.</p>
        </div>
        <Button as={Link} to="/app/products/new" variant="primary">
          <Icon name="plus" />
          New product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {products.isLoading ? <Skeleton /> : null}
          {products.isError ? (
            <FormError>{(products.error as Error).message}</FormError>
          ) : null}
          {products.data?.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No products</EmptyTitle>
                <EmptyDescription>Create a product before originating loans.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {products.data && products.data.length > 0 ? (
            <Table<Product> aria-label="Products" items={products.data}>
              <TableHeader>
                <TableColumn id="name" isRowHeader>
                  Name
                </TableColumn>
                <TableColumn id="code">Code</TableColumn>
                <TableColumn id="rate">Rate</TableColumn>
                <TableColumn id="frequency">Frequency</TableColumn>
                <TableColumn id="tenure">Tenure</TableColumn>
                <TableColumn id="active">Active</TableColumn>
              </TableHeader>
              <TableBody<Product>>
                {(product) => (
                  <TableRow>
                    {(column) => (
                      <TableCell>
                        {column.id === "name" ? (
                          <Link to="/app/products/$id" params={{ id: product.id }}>
                            {product.name}
                          </Link>
                        ) : null}
                        {column.id === "code" ? product.code : null}
                        {column.id === "rate" ? `${String(product.defaultAnnualRate)}%` : null}
                        {column.id === "frequency" ? product.defaultFrequency : null}
                        {column.id === "tenure" ? product.defaultTenure : null}
                        {column.id === "active" ? (
                          <Badge
                            appearance="subtle"
                            variant={product.active === false ? "neutral" : "success"}
                          >
                            {product.active === false ? "No" : "Yes"}
                          </Badge>
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

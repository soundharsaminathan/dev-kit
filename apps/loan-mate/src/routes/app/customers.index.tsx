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

type Customer = {
  id: string;
  customerNumber?: string;
  name: string;
  mobile: string;
  pan?: string;
  branchId?: string;
  blacklisted?: boolean;
  npa?: boolean;
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
          <Heading level={1}>Customers</Heading>
          <p>Company customers — mobile and PAN unique within company.</p>
        </div>
        <Button as={Link} to="/app/customers/new" variant="primary">
          <Icon name="plus" />
          New customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.isLoading ? <Skeleton /> : null}
          {customers.isError ? (
            <FormError>{(customers.error as Error).message}</FormError>
          ) : null}
          {customers.data?.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No customers</EmptyTitle>
                <EmptyDescription>Add a customer to start origination.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {customers.data && customers.data.length > 0 ? (
            <Table<Customer> aria-label="Customers" items={customers.data}>
              <TableHeader>
                <TableColumn id="number" isRowHeader>
                  Number
                </TableColumn>
                <TableColumn id="name">Name</TableColumn>
                <TableColumn id="mobile">Mobile</TableColumn>
                <TableColumn id="pan">PAN</TableColumn>
                <TableColumn id="status">Status</TableColumn>
              </TableHeader>
              <TableBody<Customer>>
                {(customer) => (
                  <TableRow>
                    {(column) => (
                      <TableCell>
                        {column.id === "number" ? (
                          <Link to="/app/customers/$id" params={{ id: customer.id }}>
                            {customer.customerNumber ?? customer.id}
                          </Link>
                        ) : null}
                        {column.id === "name" ? customer.name : null}
                        {column.id === "mobile" ? customer.mobile : null}
                        {column.id === "pan" ? (customer.pan ?? "—") : null}
                        {column.id === "status" ? (
                          customer.blacklisted ? (
                            <Badge variant="danger" appearance="subtle">
                              Blacklisted
                            </Badge>
                          ) : customer.npa ? (
                            <Badge variant="warning" appearance="subtle">
                              NPA
                            </Badge>
                          ) : (
                            <Badge variant="success" appearance="subtle">
                              Active
                            </Badge>
                          )
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

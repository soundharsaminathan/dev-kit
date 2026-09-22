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
          <Heading level={1}>Loans</Heading>
          <p>Origination through disbursement and active servicing.</p>
        </div>
        <Button as={Link} to="/app/loans/new" variant="primary">
          <Icon name="plus" />
          New loan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.isLoading ? <Skeleton /> : null}
          {loans.isError ? (
            <FormError>{(loans.error as Error).message}</FormError>
          ) : null}
          {loans.data?.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No loans</EmptyTitle>
                <EmptyDescription>Originate a loan to see it here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {loans.data && loans.data.length > 0 ? (
            <Table<Loan> aria-label="Loans" items={loans.data}>
              <TableHeader>
                <TableColumn id="loan" isRowHeader>
                  Loan
                </TableColumn>
                <TableColumn id="customer">Customer</TableColumn>
                <TableColumn id="product">Product</TableColumn>
                <TableColumn id="principal">Principal</TableColumn>
                <TableColumn id="status">Status</TableColumn>
              </TableHeader>
              <TableBody<Loan>>
                {(loan) => (
                  <TableRow>
                    {(column) => (
                      <TableCell>
                        {column.id === "loan" ? (
                          <Link to="/app/loans/$id" params={{ id: loan.id }}>
                            {loan.loanNumber}
                          </Link>
                        ) : null}
                        {column.id === "customer" ? (loan.customer?.name ?? "—") : null}
                        {column.id === "product" ? (loan.product?.name ?? "—") : null}
                        {column.id === "principal"
                          ? typeof loan.principal === "number"
                            ? loan.principal.toLocaleString("en-IN")
                            : loan.principal
                          : null}
                        {column.id === "status" ? (
                          <Badge appearance="subtle">{loan.status}</Badge>
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

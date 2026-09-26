import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Card, CardContent } from "@dev-ui/components/card";
import { Empty, EmptyDescription } from "@dev-ui/components/empty";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatApprovalPayload } from "@/lib/approval-summary";
import { useAuth } from "@/lib/auth";
import { FormError } from "@/modules/ui/controls";

type Approval = {
  id: string;
  type?: string;
  status: string;
  entityType?: string;
  createdAt?: string;
  reason?: string;
  maker?: { id: string; name: string; email: string };
  payload?: Record<string, unknown> | null;
};

export const Route = createFileRoute("/app/approvals/")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const approvals = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.get<Approval[]>("/approvals"),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Approvals</h1>
          <p>Open a request to review the full loan before you decide.</p>
        </div>
      </div>

      <Card>
        <CardContent>
          {approvals.isLoading ? <Skeleton /> : null}
          {approvals.isError ? (
            <FormError>{(approvals.error as Error).message}</FormError>
          ) : null}
          {approvals.data?.length === 0 ? (
            <Empty>
              <EmptyDescription>No pending approvals.</EmptyDescription>
            </Empty>
          ) : null}
          {approvals.data && approvals.data.length > 0 ? (
            <Table<Approval> aria-label="Approvals" items={approvals.data}>
              <TableHeader>
                <TableColumn id="type" isRowHeader>
                  Type
                </TableColumn>
                <TableColumn id="summary">Summary</TableColumn>
                <TableColumn id="maker">Requested by</TableColumn>
                <TableColumn id="created">Created</TableColumn>
                <TableColumn id="actions">Actions</TableColumn>
              </TableHeader>
              <TableBody<Approval>>
                {(approval) => (
                  <TableRow>
                    {(column) => (
                      <TableCell>
                        {column.id === "type" ? (
                          <Badge appearance="subtle">
                            {(
                              approval.type ??
                              approval.entityType ??
                              "—"
                            ).replaceAll("_", " ")}
                          </Badge>
                        ) : null}
                        {column.id === "summary"
                          ? `${formatApprovalPayload(approval.payload)}${
                              approval.reason ? ` — ${approval.reason}` : ""
                            }`
                          : null}
                        {column.id === "maker"
                          ? (approval.maker?.name ?? "—")
                          : null}
                        {column.id === "created"
                          ? approval.createdAt
                            ? new Date(approval.createdAt).toLocaleString()
                            : "—"
                          : null}
                        {column.id === "actions" ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              void navigate({
                                to: "/app/approvals/$id",
                                params: { id: approval.id },
                              })
                            }
                          >
                            Review
                          </Button>
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

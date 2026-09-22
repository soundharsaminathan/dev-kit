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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { formatApprovalPayload } from "@/lib/approval-summary";
import { useAuth } from "@/lib/auth";
import { FormError } from "@/modules/ui/controls";
import { FormInput } from "@/modules/ui/form-fields";

type Approval = {
  id: string;
  type?: string;
  status: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  createdAt?: string;
  maker?: { id: string; name: string; email: string };
  payload?: Record<string, unknown> | null;
};

export const Route = createFileRoute("/app/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  const approvals = useQuery({
    queryKey: ["approvals"],
    queryFn: () => api.get<Approval[]>("/approvals"),
  });

  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
      rejectionReason,
    }: {
      id: string;
      decision: "approve" | "reject";
      rejectionReason?: string;
    }) =>
      api.post(`/approvals/${id}/${decision}`, {
        reason: rejectionReason,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Action failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Approvals</h1>
          <p>Single-level maker-checker — maker cannot approve own request.</p>
        </div>
      </div>

      {error ? <FormError>{error}</FormError> : null}

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
                          {approval.type ?? approval.entityType ?? "—"}
                        </Badge>
                      ) : null}
                      {column.id === "summary"
                        ? `${formatApprovalPayload(
                            approval.payload as Record<string, unknown> | undefined,
                          )}${approval.reason ? ` — ${approval.reason}` : ""}`
                        : null}
                      {column.id === "maker" ? (approval.maker?.name ?? "—") : null}
                      {column.id === "created"
                        ? approval.createdAt
                          ? new Date(approval.createdAt).toLocaleString()
                          : "—"
                        : null}
                      {column.id === "actions" ? (
                        <div className="lm-actions">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            isDisabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({
                                id: approval.id,
                                decision: "approve",
                              })
                            }
                          >
                            Approve
                          </Button>
                          <FormInput
                            label="Reject reason"
                            value={reason[approval.id] ?? ""}
                            onChange={(value) =>
                              setReason((current) => ({
                                ...current,
                                [approval.id]: value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            isDisabled={decide.isPending}
                            onClick={() => {
                              const rejectionReason = reason[approval.id]?.trim();
                              decide.mutate({
                                id: approval.id,
                                decision: "reject",
                                ...(rejectionReason ? { rejectionReason } : {}),
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
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

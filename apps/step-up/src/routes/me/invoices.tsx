import { Badge } from "@dev-ui/components/badge";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { fetchAllPages } from "@/lib/api-page";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import {
  type Invoice,
  invoiceTilePeriodLabel,
} from "@/modules/payments/invoice-types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./invoices.module.scss";

type MeInvoice = Pick<
  Invoice,
  | "id"
  | "amount"
  | "status"
  | "dueDate"
  | "paidAt"
  | "paymentHoldExpiresAt"
  | "batchName"
  | "chargeType"
  | "attendedSessionCount"
  | "billedSessionCount"
  | "canConvertToQuarterly"
  | "periodStart"
  | "periodEnd"
  | "billMonthKeys"
  | "billPeriodLabel"
  | "membership"
>;

export const Route = createFileRoute("/me/invoices")({
  component: MeInvoicesPage,
});

function MeInvoicesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("MeInvoicesPage");
  const { studentId } = useActiveStudentContext();

  const query = useQuery({
    queryKey: ["invoices", "student", studentId],
    queryFn: () =>
      fetchAllPages<MeInvoice>((cursor) => {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        return api.get<
          | MeInvoice[]
          | { items: MeInvoice[]; nextCursor: string | null; limit: number }
        >(`/billing/student/${studentId}?${params.toString()}`);
      }),
    enabled: Boolean(studentId),
  });

  const convertToQuarterly = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/billing/${invoiceId}/convert-quarterly`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["invoices", "student", studentId],
      });
      toast({
        title: "Converted to quarterly",
        description: "Your next invoice now covers three months.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t convert to quarterly",
        description:
          error instanceof Error ? error.message : "Could not convert invoice.",
        variant: "error",
      });
    },
  });

  return (
    <Screen
      title="Invoices"
      subtitle="Payment status for your membership."
      showBack
      backTo="/me/profile"
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        {query.isLoading ? <SkeletonCardList count={3} /> : null}

        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load invoices."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {!query.isLoading &&
        !query.isError &&
        (!query.data || query.data.length === 0) ? (
          <EmptyState
            title="No invoices"
            description="Invoices appear when your plan bills."
          />
        ) : null}

        {query.data && query.data.length > 0 ? (
          <div className={styles.list}>
            {query.data.map((invoice) => {
              const periodLabel = invoiceTilePeriodLabel(invoice);
              return (
                <div key={invoice.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div>
                      <p className={styles.amount}>₹{invoice.amount}</p>
                      {invoice.batchName ? (
                        <p className={styles.due}>{invoice.batchName}</p>
                      ) : null}
                      {periodLabel ? (
                        <p
                          className={styles.due}
                          data-testid={`invoice-months-${invoice.id}`}
                        >
                          {periodLabel}
                        </p>
                      ) : invoice.dueDate ? (
                        <p className={styles.due}>
                          Due {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      ) : null}
                      {invoice.chargeType === "POSTPAID_PRORATED" &&
                      invoice.billedSessionCount != null ? (
                        <p className={styles.due}>
                          {invoice.attendedSessionCount ?? 0} /{" "}
                          {invoice.billedSessionCount} sessions
                        </p>
                      ) : null}
                      {invoice.chargeType === "PREPAID_PRORATED" &&
                      invoice.billedSessionCount != null ? (
                        <p className={styles.due}>
                          {invoice.attendedSessionCount ?? 0} /{" "}
                          {invoice.billedSessionCount} remaining
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant={
                        invoice.status === "PAID"
                          ? "success"
                          : invoice.status === "OVERDUE"
                            ? "danger"
                            : invoice.status === "REFUNDED"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  {invoice.status === "PENDING" ? (
                    <div className={styles.actions}>
                      <TouchButton variant="quiet" isDisabled>
                        Pay at front desk
                      </TouchButton>
                      {invoice.canConvertToQuarterly ? (
                        <TouchButton
                          variant="quiet"
                          data-testid={`convert-quarterly-${invoice.id}`}
                          isPending={
                            convertToQuarterly.isPending &&
                            convertToQuarterly.variables === invoice.id
                          }
                          onClick={() => convertToQuarterly.mutate(invoice.id)}
                        >
                          Convert to quarterly
                        </TouchButton>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </PullToRefresh>
    </Screen>
  );
}

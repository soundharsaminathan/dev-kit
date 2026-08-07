import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useActiveStudentContext } from "@/modules/me/use-active-student-context";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./invoices.module.scss";

type Invoice = {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  dueDate: string;
};

export const Route = createFileRoute("/me/invoices")({
  component: MeInvoicesPage,
});

function MeInvoicesPage() {
  const api = useApi();
  const { studentId } = useActiveStudentContext();

  const query = useQuery({
    queryKey: ["invoices", "student", studentId],
    queryFn: () => api.get<Invoice[]>(`/billing/student/${studentId}`),
    enabled: Boolean(studentId),
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
            {query.data.map((invoice) => (
              <div key={invoice.id} className={styles.row}>
                <div className={styles.rowTop}>
                  <div>
                    <p className={styles.amount}>₹{invoice.amount}</p>
                    <p className={styles.due}>
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
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
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </PullToRefresh>
    </Screen>
  );
}

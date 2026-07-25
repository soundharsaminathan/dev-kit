import { Badge } from "@dev-ui/components/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  student?: { name: string };
};

export const Route = createFileRoute("/app/invoices")({
  component: InvoicesPage,
});

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type PaymentMethod = "CASH" | "UPI_MANUAL";

function InvoicesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["invoices", STUDIO_ID],
    queryFn: () => api.get<Invoice[]>(`/billing/studio/${STUDIO_ID}`),
  });

  const markPaid = useMutation({
    mutationFn: (payload: { id: string; paymentMethod: PaymentMethod }) =>
      api.patch(`/billing/${payload.id}/paid`, {
        paymentMethod: payload.paymentMethod,
      }),
    onSuccess: () => {
      setActiveId(null);
      setPaymentMethod(null);
      void queryClient.invalidateQueries({ queryKey: ["invoices", STUDIO_ID] });
    },
  });

  const filtered = useMemo(() => {
    const items = query.data ?? [];
    if (filter === "ALL") return items;
    return items.filter((invoice) => invoice.status === filter);
  }, [query.data, filter]);

  const active =
    (query.data ?? []).find((invoice) => invoice.id === activeId) ?? null;

  function closeSheet() {
    setActiveId(null);
    setPaymentMethod(null);
  }

  function openMarkPaid(id: string) {
    setPaymentMethod(null);
    setActiveId(id);
  }

  const methodLabel =
    paymentMethod === "CASH"
      ? "cash"
      : paymentMethod === "UPI_MANUAL"
        ? "UPI"
        : null;

  return (
    <Screen title="Invoices" subtitle="Record cash and UPI payments.">
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "OVERDUE", label: "Overdue" },
              { id: "PAID", label: "Paid" },
            ]}
            selected={[filter]}
            onToggle={(id) => setFilter(id)}
          />

          {query.isLoading ? <SkeletonCardList count={4} /> : null}

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

          {query.data && filtered.length === 0 ? (
            <EmptyState
              title="No invoices"
              description="Invoices appear when subscriptions bill."
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className={staff.list}>
              {filtered.map((invoice) => (
                <PressableCard key={invoice.id} asDiv>
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>
                        {invoice.student?.name ?? invoice.studentId}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "PAID"
                            ? "success"
                            : invoice.status === "OVERDUE"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className={staff.rowMeta}>
                      {formatPrice(invoice.amount)}
                    </p>
                    {invoice.status !== "PAID" ? (
                      <div className={staff.rowActions}>
                        <TouchButton
                          size="md"
                          variant="primary"
                          data-testid={`mark-paid-${invoice.id}`}
                          onClick={() => openMarkPaid(invoice.id)}
                        >
                          Mark paid
                        </TouchButton>
                      </div>
                    ) : null}
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <AppBottomSheet
        isOpen={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title={
          active
            ? `Mark paid · ${active.student?.name ?? "Invoice"}`
            : "Mark paid"
        }
      >
        {active ? (
          <div className={staff.sheetStack}>
            <p className={staff.rowMeta}>
              {formatPrice(active.amount)} · {active.status}
            </p>
            <p className={staff.rowMeta}>
              {paymentMethod
                ? `Confirm recording ${formatPrice(active.amount)} as ${methodLabel} paid for ${active.student?.name ?? "this student"}. This cannot be undone from here.`
                : "Choose how payment was received, then confirm."}
            </p>
            {markPaid.isError ? (
              <ErrorState
                description={
                  markPaid.error instanceof Error
                    ? markPaid.error.message
                    : "Could not mark invoice paid."
                }
              />
            ) : null}
            <div className={staff.sheetActions}>
              <TouchButton
                variant={paymentMethod === "CASH" ? "primary" : "default"}
                fullWidth
                isDisabled={markPaid.isPending}
                onClick={() => setPaymentMethod("CASH")}
              >
                Cash
              </TouchButton>
              <TouchButton
                variant={paymentMethod === "UPI_MANUAL" ? "primary" : "default"}
                fullWidth
                isDisabled={markPaid.isPending}
                onClick={() => setPaymentMethod("UPI_MANUAL")}
              >
                UPI
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                isDisabled={!paymentMethod}
                isPending={markPaid.isPending}
                data-testid="confirm-mark-paid"
                onClick={() => {
                  if (!paymentMethod) return;
                  markPaid.mutate({
                    id: active.id,
                    paymentMethod,
                  });
                }}
              >
                Confirm mark as paid
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppBottomSheet>
    </Screen>
  );
}

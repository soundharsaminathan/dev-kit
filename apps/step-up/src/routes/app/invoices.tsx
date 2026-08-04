import { Badge } from "@dev-ui/components/badge";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { FamilyCheckoutSheet } from "@/modules/payments/family-checkout-sheet";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type CoveredSeat = {
  studentId: string;
  seatRole: "ADULT" | "KID";
  batchId?: string;
};

type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  kind: "FAMILY" | "INDIVIDUAL";
  student?: { name: string };
  familySummary?: {
    planName: string | null;
    adultCount: number | null;
    kidCount: number | null;
    coveredStudents: CoveredSeat[] | null;
  } | null;
  purchaseMeta?: {
    subscriptionId: string;
    purchaserUserId: string;
    coveredStudents: CoveredSeat[];
  } | null;
};

export const Route = createFileRoute("/app/invoices")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
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
type StatusFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID";

function InvoicesPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("InvoicesPage");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [familyOnly, setFamilyOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [familyOpenId, setFamilyOpenId] = useState<string | null>(null);
  const [sellFamilyOpen, setSellFamilyOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["invoices", studioId],
    queryFn: () => api.get<Invoice[]>(`/billing/studio/${studioId}`),
  });

  const markPaid = useMutation({
    mutationFn: (payload: { id: string; paymentMethod: PaymentMethod }) =>
      api.patch(`/billing/${payload.id}/paid`, {
        paymentMethod: payload.paymentMethod,
      }),
    onSuccess: () => {
      setActiveId(null);
      setFamilyOpenId(null);
      setPaymentMethod(null);
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Invoice marked paid",
        description: "Payment was recorded for this invoice.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t mark invoice paid",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark invoice paid.",
        variant: "error",
      });
    },
  });

  const filtered = useMemo(() => {
    let items = query.data ?? [];
    if (familyOnly) {
      items = items.filter((invoice) => invoice.kind === "FAMILY");
    }
    if (statusFilter !== "ALL") {
      items = items.filter((invoice) => invoice.status === statusFilter);
    }
    return items;
  }, [query.data, familyOnly, statusFilter]);

  const active =
    (query.data ?? []).find((invoice) => invoice.id === activeId) ?? null;
  const familyInvoice =
    (query.data ?? []).find((invoice) => invoice.id === familyOpenId) ?? null;

  function closeMarkPaid() {
    setActiveId(null);
    setPaymentMethod(null);
  }

  function closeFamilyOpen() {
    setFamilyOpenId(null);
    setPaymentMethod(null);
  }

  function openMarkPaid(id: string) {
    setPaymentMethod(null);
    setActiveId(id);
  }

  function openFamily(id: string) {
    setPaymentMethod(null);
    setFamilyOpenId(id);
  }

  const methodLabel =
    paymentMethod === "CASH"
      ? "cash"
      : paymentMethod === "UPI_MANUAL"
        ? "UPI"
        : null;

  return (
    <Screen
      title="Invoices"
      subtitle="Collect individual payments or sell family packs."
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          <FilterChipRow
            chips={[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: "Pending" },
              { id: "OVERDUE", label: "Overdue" },
              { id: "PAID", label: "Paid" },
              { id: "FAMILY", label: "Family" },
            ]}
            selected={
              familyOnly
                ? ["FAMILY", ...(statusFilter !== "ALL" ? [statusFilter] : [])]
                : [statusFilter]
            }
            onToggle={(id) => {
              if (id === "FAMILY") {
                setFamilyOnly((current) => !current);
                return;
              }
              setStatusFilter((current) =>
                current === id ? "ALL" : (id as StatusFilter),
              );
            }}
          />

          <TouchButton
            variant="primary"
            fullWidth
            data-testid="sell-family-pack"
            onClick={() => setSellFamilyOpen(true)}
          >
            Sell family pack
          </TouchButton>

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
              title={familyOnly ? "No family invoices" : "No invoices"}
              description={
                familyOnly
                  ? "Sell a family pack or wait for a member family checkout."
                  : "Invoices appear when subscriptions bill."
              }
            />
          ) : null}

          {filtered.length > 0 ? (
            <div className={staff.list}>
              {filtered.map((invoice) => {
                const isFamily = invoice.kind === "FAMILY";
                const unpaid = invoice.status !== "PAID";
                return (
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
                        {" · "}
                        {isFamily ? "Family" : "Individual"}
                        {isFamily && invoice.familySummary?.planName
                          ? ` · ${invoice.familySummary.planName}`
                          : ""}
                      </p>
                      {isFamily &&
                      invoice.familySummary &&
                      (invoice.familySummary.adultCount != null ||
                        invoice.familySummary.kidCount != null) ? (
                        <p className={staff.rowMeta}>
                          {invoice.familySummary.adultCount ?? 0} adult
                          {(invoice.familySummary.adultCount ?? 0) === 1
                            ? ""
                            : "s"}
                          {" · "}
                          {invoice.familySummary.kidCount ?? 0} kid
                          {(invoice.familySummary.kidCount ?? 0) === 1
                            ? ""
                            : "s"}
                        </p>
                      ) : null}
                      {unpaid ? (
                        <div className={staff.rowActions}>
                          {isFamily ? (
                            <TouchButton
                              size="md"
                              variant="primary"
                              data-testid={`open-family-${invoice.id}`}
                              onClick={() => openFamily(invoice.id)}
                            >
                              Open family
                            </TouchButton>
                          ) : (
                            <TouchButton
                              size="md"
                              variant="primary"
                              data-testid={`mark-paid-${invoice.id}`}
                              onClick={() => openMarkPaid(invoice.id)}
                            >
                              Mark paid
                            </TouchButton>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </PressableCard>
                );
              })}
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <AppSheet
        isOpen={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) closeMarkPaid();
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
      </AppSheet>

      <AppSheet
        isOpen={Boolean(familyInvoice)}
        onOpenChange={(open) => {
          if (!open) closeFamilyOpen();
        }}
        title={
          familyInvoice
            ? `Family · ${familyInvoice.student?.name ?? "Checkout"}`
            : "Family"
        }
        size="tall"
      >
        {familyInvoice ? (
          <div className={staff.sheetStack}>
            <p className={staff.rowMeta}>
              {formatPrice(familyInvoice.amount)} · {familyInvoice.status}
              {familyInvoice.familySummary?.planName
                ? ` · ${familyInvoice.familySummary.planName}`
                : ""}
            </p>
            {familyInvoice.purchaseMeta?.coveredStudents?.length ? (
              <>
                <p className={staff.sectionTitle}>Seats</p>
                <div className={staff.list}>
                  {familyInvoice.purchaseMeta.coveredStudents.map((seat) => (
                    <div
                      key={`${seat.studentId}-${seat.seatRole}`}
                      className={staff.rowCard}
                    >
                      <p className={staff.rowTitle}>
                        {seat.seatRole === "ADULT" ? "Adult" : "Kid"}
                      </p>
                      <p className={staff.rowMeta}>
                        {seat.studentId}
                        {seat.batchId ? ` · batch ${seat.batchId}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className={staff.rowMeta}>
                {familyInvoice.familySummary
                  ? `${familyInvoice.familySummary.adultCount ?? 0} adults · ${familyInvoice.familySummary.kidCount ?? 0} kids`
                  : "Family pack payment"}
              </p>
            )}
            <p className={staff.rowMeta}>
              {paymentMethod
                ? `Confirm recording ${formatPrice(familyInvoice.amount)} as ${methodLabel}. Membership activates on confirm.`
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
                data-testid="confirm-open-family-paid"
                onClick={() => {
                  if (!paymentMethod) return;
                  markPaid.mutate({
                    id: familyInvoice.id,
                    paymentMethod,
                  });
                }}
              >
                Confirm payment
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppSheet>

      <FamilyCheckoutSheet
        isOpen={sellFamilyOpen}
        onOpenChange={setSellFamilyOpen}
      />
    </Screen>
  );
}

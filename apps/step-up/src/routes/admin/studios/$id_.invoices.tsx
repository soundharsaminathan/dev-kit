import { Input } from "@dev-ui/components/input";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import {
  currentMonthKey,
  formatInr,
  planLabel,
  statusLabel,
  STUDIO_PLAN_AMOUNTS,
  type StudioInvoice,
  type StudioInvoicePaymentMethod,
  type StudioPlan,
  type StudioUsageResponse,
} from "@/modules/admin/studio-invoice-types";
import { SettingsField, SettingsSection } from "@/modules/settings/ui";
import { AppSheet } from "@/modules/ui/app-sheet";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/admin/studios/$id_/invoices")({
  component: AdminStudioInvoicesPage,
});

function AdminStudioInvoicesPage() {
  const { id: studioId } = Route.useParams();
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AdminStudioInvoicesPage");

  const [month, setMonth] = useState(currentMonthKey());
  const [plan, setPlan] = useState<StudioPlan>("BASIC");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payInvoice, setPayInvoice] = useState<StudioInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<StudioInvoicePaymentMethod>("UPI_MANUAL");

  const usageQuery = useQuery({
    queryKey: ["admin", "studio-usage", studioId, month],
    queryFn: () =>
      api.get<StudioUsageResponse>(
        `/studios/${studioId}/usage?month=${encodeURIComponent(month)}`,
      ),
  });

  const invoicesQuery = useQuery({
    queryKey: ["admin", "studio-invoices", studioId],
    queryFn: () =>
      api.get<StudioInvoice[]>(`/studios/${studioId}/studio-invoices`),
  });

  useEffect(() => {
    if (!usageQuery.data || editingId) return;
    setPlan(usageQuery.data.suggestedPlan);
  }, [usageQuery.data, editingId]);

  const listAmount = STUDIO_PLAN_AMOUNTS[plan];
  const discountNumber = Number(discount) || 0;
  const amountDue = Math.max(0, listAmount - discountNumber);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "studio-invoices", studioId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "studio-usage", studioId],
    });
    void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<StudioInvoice>(`/studios/${studioId}/studio-invoices`, {
        month,
        plan,
        discount: discountNumber,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      setNotes("");
      setDiscount("0");
      setEditingId(null);
      invalidate();
      toast({
        title: "Draft saved",
        description: "Plan invoice draft is ready to publish.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save draft",
        description:
          error instanceof Error ? error.message : "Could not create invoice.",
        variant: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.patch<StudioInvoice>(`/studio-invoices/${invoiceId}`, {
        month,
        plan,
        discount: discountNumber,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      setEditingId(null);
      setNotes("");
      setDiscount("0");
      invalidate();
      toast({
        title: "Draft updated",
        description: "Changes saved on the draft invoice.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t update draft",
        description:
          error instanceof Error ? error.message : "Could not update invoice.",
        variant: "error",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post<StudioInvoice>(`/studio-invoices/${invoiceId}/publish`, {}),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Published to owner",
        description: "The studio owner can now see this invoice.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t publish",
        description:
          error instanceof Error ? error.message : "Could not publish invoice.",
        variant: "error",
      });
    },
  });

  const voidMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post<StudioInvoice>(`/studio-invoices/${invoiceId}/void`, {}),
    onSuccess: () => {
      if (editingId) {
        setEditingId(null);
        setNotes("");
        setDiscount("0");
      }
      invalidate();
      toast({
        title: "Invoice voided",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t void",
        description:
          error instanceof Error ? error.message : "Could not void invoice.",
        variant: "error",
      });
    },
  });

  const paidMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post<StudioInvoice>(`/studio-invoices/${invoiceId}/paid`, {
        paymentMethod,
      }),
    onSuccess: () => {
      setPayInvoice(null);
      invalidate();
      toast({
        title: "Marked paid",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t mark paid",
        description:
          error instanceof Error ? error.message : "Could not mark paid.",
        variant: "error",
      });
    },
  });

  const startEdit = (invoice: StudioInvoice) => {
    setMonth(invoice.month);
    setPlan(invoice.plan);
    setDiscount(String(invoice.discount));
    setNotes(invoice.notes ?? "");
    setEditingId(invoice.id);
  };

  const usage = usageQuery.data;
  const invoices = invoicesQuery.data ?? [];
  const draftForMonth = useMemo(
    () =>
      invoices.find(
        (row) => row.status === "DRAFT" && row.month === month,
      ),
    [invoices, month],
  );

  return (
    <Screen
      title="Plan invoices"
      subtitle="Draft classa plan invoices from live usage. Publish when ready for the owner."
      showBack
      backTo="/admin"
    >
      <SettingsSection
        title="Compose"
        description="Usage is a hint only. Studios are never blocked from creating students or classes."
      >
        <SettingsField label="Month">
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            data-testid="studio-invoice-month"
          />
        </SettingsField>

        {usageQuery.isLoading ? <SkeletonBlock height="6rem" /> : null}
        {usageQuery.isError ? (
          <ErrorState
            description={
              usageQuery.error instanceof Error
                ? usageQuery.error.message
                : "Could not load usage."
            }
          />
        ) : null}
        {usage ? (
          <div className={staff.metrics}>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Active students</span>
              <strong className={staff.metricValue}>
                {usage.activeStudents}
              </strong>
            </div>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Trainers</span>
              <strong className={staff.metricValue}>{usage.trainers}</strong>
            </div>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Staff</span>
              <strong className={staff.metricValue}>{usage.staff}</strong>
            </div>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Batches</span>
              <strong className={staff.metricValue}>{usage.batches}</strong>
            </div>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Sessions this month</span>
              <strong className={staff.metricValue}>
                {usage.sessionsThisMonth}
              </strong>
            </div>
            <div className={staff.metricCard}>
              <span className={staff.metricLabel}>Suggested</span>
              <strong className={staff.metricValue}>
                {planLabel(usage.suggestedPlan)} ·{" "}
                {formatInr(usage.suggestedAmount)}
              </strong>
            </div>
          </div>
        ) : null}

        <SettingsField label="Plan">
          <select
            value={plan}
            onChange={(event) => setPlan(event.target.value as StudioPlan)}
            data-testid="studio-invoice-plan"
          >
            <option value="BASIC">
              Basic · {formatInr(STUDIO_PLAN_AMOUNTS.BASIC)}
            </option>
            <option value="ADVANCED">
              Advanced · {formatInr(STUDIO_PLAN_AMOUNTS.ADVANCED)}
            </option>
          </select>
        </SettingsField>

        <SettingsField label="Discount">
          <Input
            type="number"
            min={0}
            max={listAmount}
            step="1"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            data-testid="studio-invoice-discount"
          />
        </SettingsField>

        <SettingsField label="Notes">
          <Input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note for the owner"
            data-testid="studio-invoice-notes"
          />
        </SettingsField>

        <p className={staff.attentionMeta}>
          Amount due {formatInr(amountDue)}
          {editingId ? " · editing draft" : null}
          {!editingId && draftForMonth
            ? " · a draft already exists for this month — edit it below"
            : null}
        </p>

        <div className={staff.rowActions}>
          {editingId ? (
            <>
              <TouchButton
                variant="primary"
                isPending={updateMutation.isPending}
                data-testid="studio-invoice-update"
                onClick={() => updateMutation.mutate(editingId)}
              >
                Update draft
              </TouchButton>
              <TouchButton
                variant="default"
                onClick={() => {
                  setEditingId(null);
                  setNotes("");
                  setDiscount("0");
                }}
              >
                Cancel edit
              </TouchButton>
            </>
          ) : (
            <TouchButton
              variant="primary"
              isPending={createMutation.isPending}
              isDisabled={Boolean(draftForMonth)}
              data-testid="studio-invoice-save-draft"
              onClick={() => createMutation.mutate()}
            >
              Save draft
            </TouchButton>
          )}
        </div>
      </SettingsSection>

      <section className={staff.section}>
        <h2 className={staff.sectionTitle}>Invoices</h2>
        {invoicesQuery.isLoading ? <SkeletonBlock height="8rem" /> : null}
        {invoicesQuery.isError ? (
          <ErrorState
            description={
              invoicesQuery.error instanceof Error
                ? invoicesQuery.error.message
                : "Could not load invoices."
            }
          />
        ) : null}
        {invoices.length === 0 && !invoicesQuery.isLoading ? (
          <EmptyState
            title="No plan invoices yet"
            description="Save a draft from live usage, then publish it to the owner."
          />
        ) : null}
        {invoices.length > 0 ? (
          <ul className={staff.list}>
            {invoices.map((invoice) => (
              <li key={invoice.id} className={staff.attentionCard}>
                <p className={staff.attentionTitle}>
                  {planLabel(invoice.plan)} · {statusLabel(invoice.status)}
                </p>
                <p className={staff.attentionMeta}>
                  {invoice.month} · {formatInr(invoice.amountDue)}
                  {invoice.discount > 0
                    ? ` (list ${formatInr(invoice.listAmount)}, discount ${formatInr(invoice.discount)})`
                    : null}
                </p>
                <p className={staff.attentionMeta}>
                  {invoice.usageSnapshot.activeStudents} students ·{" "}
                  {invoice.usageSnapshot.trainers} trainers ·{" "}
                  {invoice.usageSnapshot.batches} batches ·{" "}
                  {invoice.usageSnapshot.sessionsThisMonth} sessions
                </p>
                {invoice.notes ? (
                  <p className={staff.attentionMeta}>{invoice.notes}</p>
                ) : null}
                <div className={staff.rowActions}>
                  {invoice.status === "DRAFT" ? (
                    <>
                      <TouchButton
                        variant="default"
                        size="sm"
                        data-testid={`edit-studio-invoice-${invoice.id}`}
                        onClick={() => startEdit(invoice)}
                      >
                        Edit
                      </TouchButton>
                      <TouchButton
                        variant="primary"
                        size="sm"
                        isPending={publishMutation.isPending}
                        data-testid={`publish-studio-invoice-${invoice.id}`}
                        onClick={() => publishMutation.mutate(invoice.id)}
                      >
                        Publish to owner
                      </TouchButton>
                      <TouchButton
                        variant="danger"
                        size="sm"
                        isPending={voidMutation.isPending}
                        onClick={() => voidMutation.mutate(invoice.id)}
                      >
                        Void
                      </TouchButton>
                    </>
                  ) : null}
                  {invoice.status === "PENDING" ? (
                    <>
                      <TouchButton
                        variant="primary"
                        size="sm"
                        data-testid={`pay-studio-invoice-${invoice.id}`}
                        onClick={() => {
                          setPaymentMethod("UPI_MANUAL");
                          setPayInvoice(invoice);
                        }}
                      >
                        Mark paid
                      </TouchButton>
                      <TouchButton
                        variant="danger"
                        size="sm"
                        isPending={voidMutation.isPending}
                        onClick={() => voidMutation.mutate(invoice.id)}
                      >
                        Void
                      </TouchButton>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <AppSheet
        isOpen={payInvoice !== null}
        onOpenChange={(open) => {
          if (!open && !paidMutation.isPending) setPayInvoice(null);
        }}
        title="Mark paid"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Record offline payment for{" "}
            {payInvoice ? formatInr(payInvoice.amountDue) : ""} (
            {payInvoice ? planLabel(payInvoice.plan) : ""}).
          </p>
          <SettingsField label="Payment method">
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value as StudioInvoicePaymentMethod,
                )
              }
            >
              <option value="UPI_MANUAL">UPI</option>
              <option value="CASH">Cash</option>
            </select>
          </SettingsField>
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={paidMutation.isPending}
              onClick={() => setPayInvoice(null)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="primary"
              fullWidth
              isPending={paidMutation.isPending}
              data-testid="confirm-studio-invoice-paid"
              onClick={() => {
                if (!payInvoice) return;
                paidMutation.mutate(payInvoice.id);
              }}
            >
              Confirm paid
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </Screen>
  );
}

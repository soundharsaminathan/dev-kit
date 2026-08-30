import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import {
  formatInr,
  planLabel,
  statusLabel,
  type StudioInvoice,
  type StudioUsageResponse,
} from "@/modules/admin/studio-invoice-types";
import { SettingsSection } from "@/modules/settings/ui";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";

export const Route = createFileRoute("/app/settings/plan")({
  component: StudioPlanInvoicesPage,
});

function StudioPlanInvoicesPage() {
  const api = useApi();
  const studioId = useStudioId();

  const usageQuery = useQuery({
    queryKey: ["studio-usage", studioId],
    queryFn: () =>
      api.get<StudioUsageResponse>(`/studios/${studioId}/usage`),
  });

  const invoicesQuery = useQuery({
    queryKey: ["studio-invoices", studioId],
    queryFn: () =>
      api.get<StudioInvoice[]>(`/studios/${studioId}/studio-invoices`),
  });

  const invoices = invoicesQuery.data ?? [];
  const usage = usageQuery.data;

  return (
    <>
      <SettingsSection
        title="Current usage"
        description="Live counts for this month. classa does not block creating students or classes."
      >
        {usageQuery.isLoading ? <SkeletonBlock height="5rem" /> : null}
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
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Plan invoices"
        description="Published invoices from classa. Pay offline — classa marks them paid."
      >
        {invoicesQuery.isLoading ? <SkeletonBlock height="6rem" /> : null}
        {invoicesQuery.isError ? (
          <ErrorState
            description={
              invoicesQuery.error instanceof Error
                ? invoicesQuery.error.message
                : "Could not load plan invoices."
            }
          />
        ) : null}
        {invoices.length === 0 && !invoicesQuery.isLoading ? (
          <EmptyState
            title="No plan invoices yet"
            description="When classa publishes a plan invoice, it will show up here."
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
                    ? ` · discount ${formatInr(invoice.discount)}`
                    : null}
                </p>
                <p className={staff.attentionMeta}>
                  Snapshot · {invoice.usageSnapshot.activeStudents} students ·{" "}
                  {invoice.usageSnapshot.trainers} trainers ·{" "}
                  {invoice.usageSnapshot.staff} staff ·{" "}
                  {invoice.usageSnapshot.batches} batches ·{" "}
                  {invoice.usageSnapshot.sessionsThisMonth} sessions
                </p>
                {invoice.notes ? (
                  <p className={staff.attentionMeta}>{invoice.notes}</p>
                ) : null}
                {invoice.paidAt ? (
                  <p className={staff.attentionMeta}>
                    Paid{" "}
                    {new Date(invoice.paidAt).toLocaleDateString("en-IN")}
                    {invoice.paymentMethod
                      ? ` · ${invoice.paymentMethod === "CASH" ? "Cash" : "UPI"}`
                      : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </SettingsSection>
    </>
  );
}

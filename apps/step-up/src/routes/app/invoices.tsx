import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { useToastContext } from "@dev-ui/components/toast";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { CollectPaymentSheet } from "@/modules/payments/collect-payment-sheet";
import { FamilyCheckoutSheet } from "@/modules/payments/family-checkout-sheet";
import { FamilyPaySheet } from "@/modules/payments/family-pay-sheet";
import {
  formatPrice,
  type Invoice,
  type StudioFamily,
} from "@/modules/payments/invoice-types";
import screen from "@/modules/payments/invoices-screen.module.scss";
import { printInvoice } from "@/modules/payments/print-invoice";
import {
  StudentSearchCombobox,
  type StudioStudent,
} from "@/modules/students/student-search-combobox";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/app/invoices")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: InvoicesPage,
});

type StatusFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID";

type StudioMember = {
  id: string;
  name: string;
  role: string;
};

function statusBadgeVariant(status: Invoice["status"]) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "REFUNDED") return "warning" as const;
  return "neutral" as const;
}

function familySeatCounts(family: StudioFamily) {
  const adults =
    family.members.filter((member) => member.seatRole === "ADULT").length +
    (family.ownerRole === "STUDENT" ? 1 : 0);
  const kids = family.members.filter(
    (member) => member.seatRole === "KID",
  ).length;
  return { adults, kids };
}

type InvoiceCardProps = {
  invoice: Invoice;
  collectTestId: string;
  onCollect: () => void;
};

function InvoiceCard({ invoice, collectTestId, onCollect }: InvoiceCardProps) {
  const { toast } = useToastContext("InvoiceCard");
  const unpaid = invoice.status !== "PAID";
  const isFamily = invoice.kind === "FAMILY";
  const summary = invoice.familySummary;
  const metaParts = [isFamily ? "Family pack" : "Individual"];
  if (isFamily && summary?.planName) {
    metaParts.push(summary.planName);
  }
  if (
    isFamily &&
    summary &&
    (summary.adultCount != null || summary.kidCount != null)
  ) {
    metaParts.push(
      `${summary.adultCount ?? 0} adult${(summary.adultCount ?? 0) === 1 ? "" : "s"} · ${summary.kidCount ?? 0} kid${(summary.kidCount ?? 0) === 1 ? "" : "s"}`,
    );
  }

  return (
    <PressableCard asDiv>
      <div className={staff.rowCard}>
        <div className={staff.attentionTop}>
          <span className={staff.rowTitle}>
            {invoice.student?.name ?? invoice.studentId}
          </span>
          <Badge variant={statusBadgeVariant(invoice.status)}>
            {invoice.status}
          </Badge>
        </div>
        <div className={screen.amountRow}>
          <span className={screen.amount}>{formatPrice(invoice.amount)}</span>
          <span className={screen.amountHint}>
            {unpaid ? "Total due" : "Total paid"}
          </span>
        </div>
        <p className={staff.rowMeta}>{metaParts.join(" · ")}</p>
        <div className={staff.rowActions}>
          {unpaid ? (
            <TouchButton
              size="md"
              variant="primary"
              data-testid={collectTestId}
              onClick={onCollect}
            >
              Collect payment
            </TouchButton>
          ) : (
            <TouchButton
              size="md"
              variant="default"
              data-testid={`print-invoice-${invoice.id}`}
              onClick={() => {
                const opened = printInvoice({
                  id: invoice.id,
                  amount: invoice.amount,
                  referralDiscount: invoice.referralDiscount,
                  studioDiscount: invoice.studioDiscount,
                  status: invoice.status,
                  paymentMethod: invoice.paymentMethod,
                  paidAt: invoice.paidAt,
                  studentName: invoice.student?.name,
                });
                if (!opened) {
                  toast({
                    title: "Couldn't open print window",
                    description: "Allow pop-ups for this site, then try again.",
                    variant: "error",
                  });
                }
              }}
            >
              Print invoice
            </TouchButton>
          )}
        </div>
      </div>
    </PressableCard>
  );
}

function InvoicesPage() {
  const api = useApi();
  const studioId = useStudioId();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedStudent, setSelectedStudent] = useState<StudioStudent | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [familyOpenId, setFamilyOpenId] = useState<string | null>(null);
  const [payFamily, setPayFamily] = useState<StudioFamily | null>(null);
  const [sellFamilyOpen, setSellFamilyOpen] = useState(false);

  const invoicesQuery = useQuery({
    queryKey: ["invoices", studioId],
    queryFn: () => api.get<Invoice[]>(`/billing/studio/${studioId}`),
  });

  const familiesQuery = useQuery({
    queryKey: ["studio-families", studioId],
    queryFn: () =>
      api.get<StudioFamily[]>(`/users/studio/${studioId}/families`),
  });

  const membersQuery = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    enabled: Boolean(familyOpenId),
  });

  const individualInvoices = useMemo(() => {
    let items = (invoicesQuery.data ?? []).filter(
      (invoice) => invoice.kind === "INDIVIDUAL",
    );
    if (selectedStudent) {
      items = items.filter(
        (invoice) => invoice.studentId === selectedStudent.id,
      );
    }
    if (statusFilter !== "ALL") {
      items = items.filter((invoice) => invoice.status === statusFilter);
    }
    return items;
  }, [invoicesQuery.data, selectedStudent, statusFilter]);

  const familyInvoices = useMemo(() => {
    const items = (invoicesQuery.data ?? []).filter(
      (invoice) => invoice.kind === "FAMILY",
    );
    return [
      ...items.filter((invoice) => invoice.status !== "PAID"),
      ...items.filter((invoice) => invoice.status === "PAID"),
    ];
  }, [invoicesQuery.data]);

  const activeInvoice =
    (invoicesQuery.data ?? []).find((invoice) => invoice.id === activeId) ??
    null;
  const familyInvoice =
    (invoicesQuery.data ?? []).find((invoice) => invoice.id === familyOpenId) ??
    null;

  const resolveStudentName = (studentId: string) =>
    membersQuery.data?.find((member) => member.id === studentId)?.name;

  return (
    <Screen
      title="Invoices"
      subtitle="Collect individual payments or family pack payments."
    >
      <PullToRefresh
        onRefresh={() =>
          Promise.all([invoicesQuery.refetch(), familiesQuery.refetch()])
        }
      >
        <Tabs defaultSelectedKey="individual" aria-label="Invoice types">
          <TabList>
            <Tab id="individual">Individual</Tab>
            <Tab id="family">Family</Tab>
          </TabList>

          <TabPanel id="individual">
            <div className={screen.panel}>
              <StudentSearchCombobox
                label="Student"
                selectedKey={selectedStudent?.id ?? null}
                onSelectionChange={setSelectedStudent}
                placeholder="Search student invoices"
              />

              <FilterChipRow
                chips={[
                  { id: "ALL", label: "All" },
                  { id: "PENDING", label: "Pending" },
                  { id: "OVERDUE", label: "Overdue" },
                  { id: "PAID", label: "Paid" },
                ]}
                selected={[statusFilter]}
                onToggle={(id) =>
                  setStatusFilter((current) =>
                    current === id ? "ALL" : (id as StatusFilter),
                  )
                }
              />

              {invoicesQuery.isLoading ? <SkeletonCardList count={4} /> : null}

              {invoicesQuery.isError ? (
                <ErrorState
                  description={
                    invoicesQuery.error instanceof Error
                      ? invoicesQuery.error.message
                      : "Could not load invoices."
                  }
                  action={
                    <TouchButton
                      variant="primary"
                      onClick={() => invoicesQuery.refetch()}
                    >
                      Try again
                    </TouchButton>
                  }
                />
              ) : null}

              {invoicesQuery.data && individualInvoices.length === 0 ? (
                <EmptyState
                  title="No invoices"
                  description={
                    selectedStudent
                      ? `No invoices for ${selectedStudent.name} with this filter.`
                      : "Individual invoices appear when subscriptions bill."
                  }
                />
              ) : null}

              {individualInvoices.length > 0 ? (
                <div className={staff.list}>
                  {individualInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      collectTestId={`mark-paid-${invoice.id}`}
                      onCollect={() => setActiveId(invoice.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </TabPanel>

          <TabPanel id="family">
            <div className={screen.panel}>
              <p className={staff.sectionTitle}>Family groups</p>

              {familiesQuery.isLoading ? <SkeletonCardList count={2} /> : null}

              {familiesQuery.isError ? (
                <ErrorState
                  description={
                    familiesQuery.error instanceof Error
                      ? familiesQuery.error.message
                      : "Could not load family groups."
                  }
                  action={
                    <TouchButton
                      variant="primary"
                      onClick={() => familiesQuery.refetch()}
                    >
                      Try again
                    </TouchButton>
                  }
                />
              ) : null}

              {familiesQuery.data && familiesQuery.data.length === 0 ? (
                <EmptyState
                  title="No family groups"
                  description="Families appear when members add family or link children. You can still sell a family pack below."
                />
              ) : null}

              {(familiesQuery.data ?? []).length > 0 ? (
                <div className={staff.list}>
                  {(familiesQuery.data ?? []).map((family) => {
                    const counts = familySeatCounts(family);
                    return (
                      <PressableCard
                        key={family.ownerId}
                        data-testid={`family-group-${family.ownerId}`}
                        onClick={() => setPayFamily(family)}
                      >
                        <div className={staff.rowCard}>
                          <div className={staff.rowWithAvatar}>
                            <Avatar size="lg" className={staff.trainerAvatar}>
                              {family.ownerPhotoUrl ? (
                                <AvatarImage
                                  src={family.ownerPhotoUrl}
                                  alt={family.ownerName}
                                />
                              ) : null}
                              <AvatarFallback>
                                {family.ownerName.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={staff.rowBody}>
                              <div className={staff.attentionTop}>
                                <span className={staff.rowTitle}>
                                  {family.ownerName}
                                </span>
                                <Badge variant="neutral">
                                  {counts.adults} adult
                                  {counts.adults === 1 ? "" : "s"} ·{" "}
                                  {counts.kids} kid
                                  {counts.kids === 1 ? "" : "s"}
                                </Badge>
                              </div>
                              <p className={staff.rowMeta}>
                                {family.members.length > 0
                                  ? family.members
                                      .map((member) => member.name)
                                      .join(", ")
                                  : "No linked members yet"}
                              </p>
                              <div className={screen.memberStack}>
                                {family.members.slice(0, 5).map((member) => (
                                  <span
                                    key={member.id}
                                    className={screen.stackAvatar}
                                  >
                                    {member.photoUrl ? (
                                      <img
                                        src={member.photoUrl}
                                        alt={member.name}
                                      />
                                    ) : (
                                      member.name.slice(0, 1).toUpperCase()
                                    )}
                                  </span>
                                ))}
                                <span className={screen.stackLabel}>
                                  Tap to collect a family payment
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PressableCard>
                    );
                  })}
                </div>
              ) : null}

              <TouchButton
                variant="default"
                fullWidth
                data-testid="sell-family-pack"
                onClick={() => setSellFamilyOpen(true)}
              >
                Sell family pack manually
              </TouchButton>

              <p className={staff.sectionTitle}>Family invoices</p>

              {invoicesQuery.data && familyInvoices.length === 0 ? (
                <EmptyState
                  title="No family invoices"
                  description="Collect a family payment above to create one."
                />
              ) : null}

              {familyInvoices.length > 0 ? (
                <div className={staff.list}>
                  {familyInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      collectTestId={`open-family-${invoice.id}`}
                      onCollect={() => setFamilyOpenId(invoice.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </TabPanel>
        </Tabs>
      </PullToRefresh>

      <CollectPaymentSheet
        invoice={activeInvoice}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
        confirmTestId="confirm-mark-paid"
      />

      <CollectPaymentSheet
        invoice={familyInvoice}
        onOpenChange={(open) => {
          if (!open) setFamilyOpenId(null);
        }}
        confirmTestId="confirm-open-family-paid"
        discountTestIdPrefix="family-"
        resolveStudentName={resolveStudentName}
      />

      <FamilyPaySheet
        family={payFamily}
        onOpenChange={(open) => {
          if (!open) setPayFamily(null);
        }}
      />

      <FamilyCheckoutSheet
        isOpen={sellFamilyOpen}
        onOpenChange={setSellFamilyOpen}
      />
    </Screen>
  );
}

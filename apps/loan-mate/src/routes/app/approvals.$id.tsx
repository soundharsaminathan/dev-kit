import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatApprovalPayload } from "@/lib/approval-summary";
import { useAuth } from "@/lib/auth";
import { FormError, FormSuccess } from "@/modules/ui/controls";
import { FormInput } from "@/modules/ui/form-fields";

type Approval = {
  id: string;
  type: string;
  status: string;
  entityType: string;
  entityId: string;
  loanId?: string | null;
  reason?: string | null;
  createdAt?: string;
  maker?: { id: string; name: string; email: string };
  payload?: Record<string, unknown> | null;
};

type Customer = {
  id: string;
  name: string;
  customerNumber?: string;
  mobile?: string;
  pan?: string;
  address?: string | null;
  blacklisted?: boolean;
  blacklistReason?: string | null;
  npa?: boolean;
  npaReason?: string | null;
};

type LoanDetail = {
  id: string;
  loanNumber: string;
  status: string;
  principal: string | number;
  annualRatePercent: string | number;
  penaltyDailyPercent?: string | number | null;
  tenureInstallments: number;
  frequency: string;
  monthlyFirstEmiOption: string;
  processingFee: string | number;
  rateOverride: boolean;
  tenureOverride: boolean;
  productOverride: boolean;
  disbursementDate?: string | null;
  disbursementMode?: string | null;
  disbursementReference?: string | null;
  netDisbursement?: string | number | null;
  advanceBalance?: string | number | null;
  restructureCount?: number;
  rejectionReason?: string | null;
  customer?: Customer;
  product?: { name: string; code: string };
  branch?: { name: string; code: string };
};

type ScheduleRow = {
  number: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  totalDue: number;
  paid: number;
  remaining: number;
  status: string;
};

type LoanSchedule = {
  projected: boolean;
  paidCount: number;
  installmentCount: number;
  outstanding: number;
  nextDueDate: string | null;
  rows: ScheduleRow[];
};

type PaymentRow = {
  id: string;
  receiptNumber?: string;
  amount: string | number;
  paymentDate: string;
  mode: string;
  reference?: string | null;
  reversed?: boolean;
};

type DocumentRow = {
  id: string;
  kind: string;
  fileName: string;
  createdAt?: string;
};

const EDITABLE_LOAN_STATUSES = ["DRAFT", "SUBMITTED", "VERIFIED", "APPROVED"];

const PAYMENT_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "info" }
> = {
  PAID: { label: "Paid", variant: "success" },
  PARTIAL: { label: "Partial", variant: "warning" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  SKIPPED: { label: "Skipped", variant: "warning" },
  PENDING: { label: "Due", variant: "info" },
  PROJECTED: { label: "Not started", variant: "info" },
};

function money(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return String(value);
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateOnly(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function loanIdOf(approval: Approval) {
  if (approval.loanId) return approval.loanId;
  if (approval.entityType === "Loan") return approval.entityId;
  const payload = approval.payload;
  if (payload && typeof payload.loanId === "string") return payload.loanId;
  if (payload && typeof payload.sourceLoanId === "string") {
    return payload.sourceLoanId;
  }
  return null;
}

function customerIdOf(approval: Approval, loan?: LoanDetail) {
  if (loan?.customer?.id) return loan.customer.id;
  if (approval.entityType === "Customer") return approval.entityId;
  const payload = approval.payload;
  if (payload && typeof payload.customerId === "string")
    return payload.customerId;
  return null;
}

export const Route = createFileRoute("/app/approvals/$id")({
  component: ApprovalReviewPage,
});

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ApprovalReviewPage() {
  const { id } = Route.useParams();
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [amounts, setAmounts] = useState({
    principal: "",
    annualRatePercent: "",
    tenureInstallments: "",
    processingFee: "",
  });

  const approval = useQuery({
    queryKey: ["approvals", id],
    queryFn: () => api.get<Approval>(`/approvals/${id}`),
  });

  const loanKey = approval.data ? loanIdOf(approval.data) : null;
  const loan = useQuery({
    queryKey: ["loans", loanKey],
    enabled: Boolean(loanKey),
    queryFn: () => api.get<LoanDetail>(`/loans/${loanKey}`),
  });

  const customerKey = approval.data
    ? customerIdOf(approval.data, loan.data)
    : null;
  const customer = useQuery({
    queryKey: ["customers", customerKey],
    enabled: Boolean(customerKey) && !loan.data?.customer,
    queryFn: () => api.get<Customer>(`/customers/${customerKey}`),
  });

  const schedule = useQuery({
    queryKey: ["loans", loanKey, "schedule"],
    enabled: Boolean(loanKey),
    queryFn: () => api.get<LoanSchedule>(`/loans/${loanKey}/schedule`),
  });

  const payments = useQuery({
    queryKey: ["payments", loanKey],
    enabled: Boolean(loanKey),
    queryFn: () => api.get<PaymentRow[]>(`/payments/loan/${loanKey}`),
  });

  const loanDocs = useQuery({
    queryKey: ["documents", "LOAN", loanKey],
    enabled: Boolean(loanKey),
    queryFn: () =>
      api.get<DocumentRow[]>(
        `/documents?entityType=LOAN&entityId=${encodeURIComponent(loanKey ?? "")}`,
      ),
  });

  const customerDocs = useQuery({
    queryKey: ["documents", "CUSTOMER", customerKey],
    enabled: Boolean(customerKey),
    queryFn: () =>
      api.get<DocumentRow[]>(
        `/documents?entityType=CUSTOMER&entityId=${encodeURIComponent(customerKey ?? "")}`,
      ),
  });

  const canEditAmounts =
    loan.data != null && EDITABLE_LOAN_STATUSES.includes(loan.data.status);
  const savedAmounts = loan.data
    ? [
        loan.data.id,
        loan.data.principal,
        loan.data.annualRatePercent,
        loan.data.tenureInstallments,
        loan.data.processingFee,
      ].join(":")
    : "";

  useEffect(() => {
    if (!loan.data) return;
    setAmounts({
      principal: String(Number(loan.data.principal)),
      annualRatePercent: String(Number(loan.data.annualRatePercent)),
      tenureInstallments: String(loan.data.tenureInstallments),
      processingFee: String(Number(loan.data.processingFee)),
    });
  }, [savedAmounts, loan.data]);

  const saveAmounts = useMutation({
    mutationFn: () =>
      api.patch<LoanDetail>(`/loans/${loanKey}/amounts`, {
        principal: Number(amounts.principal),
        annualRatePercent: Number(amounts.annualRatePercent),
        tenureInstallments: Number(amounts.tenureInstallments),
        processingFee: Number(amounts.processingFee),
      }),
    onSuccess: async () => {
      setError(null);
      setSuccess("Loan amount saved.");
      await queryClient.invalidateQueries({ queryKey: ["loans", loanKey] });
      await queryClient.invalidateQueries({
        queryKey: ["loans", loanKey, "schedule"],
      });
      await queryClient.invalidateQueries({ queryKey: ["approvals", id] });
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (err) => {
      setSuccess(null);
      setError(
        err instanceof Error ? err.message : "Could not save the amount",
      );
    },
  });

  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") =>
      api.post(`/approvals/${id}/${decision}`, {
        reason: reason.trim() || undefined,
      }),
    onSuccess: async (_data, decision) => {
      setError(null);
      setSuccess(decision === "approve" ? "Approved." : "Rejected.");
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void navigate({ to: "/app/approvals" });
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Action failed");
    },
  });

  if (approval.isLoading) {
    return (
      <div className="lm-page">
        <Skeleton />
      </div>
    );
  }

  if (approval.isError || !approval.data) {
    return (
      <FormError>
        {(approval.error as Error)?.message ?? "Approval not found"}
      </FormError>
    );
  }

  const request = approval.data;
  const person = loan.data?.customer ?? customer.data;
  const pending = request.status === "PENDING";
  const ownRequest = user?.id != null && user.id === request.maker?.id;

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Review {request.type.replaceAll("_", " ")}</h1>
          <p>
            {request.maker?.name ?? "Staff"} requested this
            {request.createdAt
              ? ` on ${new Date(request.createdAt).toLocaleString()}`
              : ""}
            .
          </p>
        </div>
        <div className="lm-actions">
          <Badge appearance="subtle">{request.status}</Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigate({ to: "/app/approvals" })}
          >
            Back
          </Button>
        </div>
      </div>

      {error ? <FormError>{error}</FormError> : null}
      {success ? <FormSuccess>{success}</FormSuccess> : null}

      {pending ? (
        <div className="lm-card">
          <h2>Decision</h2>
          {ownRequest ? (
            <p className="lm-muted">
              You requested this, so someone else has to decide it.
            </p>
          ) : (
            <div className="lm-form">
              <FormInput
                label="Note (required to reject)"
                value={reason}
                onChange={setReason}
              />
              <div className="lm-actions">
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={decide.isPending}
                  onClick={() => decide.mutate("approve")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isDisabled={decide.isPending || !reason.trim()}
                  onClick={() => decide.mutate("reject")}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="lm-card">
        <h2>Request</h2>
        <dl className="lm-details">
          <Detail label="Type" value={request.type.replaceAll("_", " ")} />
          <Detail label="Requested by" value={request.maker?.name ?? "—"} />
          <Detail label="Reason" value={request.reason?.trim() || "—"} />
          <Detail
            label="Change"
            value={formatApprovalPayload(request.payload)}
          />
        </dl>
      </div>

      <div className="lm-card">
        <h2>Customer</h2>
        {customer.isLoading && !person ? <Skeleton /> : null}
        {person ? (
          <dl className="lm-details">
            <Detail label="Name" value={person.name} />
            <Detail label="Number" value={person.customerNumber ?? "—"} />
            <Detail label="Mobile" value={person.mobile ?? "—"} />
            <Detail label="PAN" value={person.pan ?? "—"} />
            <Detail label="Address" value={person.address?.trim() || "—"} />
            <Detail
              label="Blacklist"
              value={
                person.blacklisted
                  ? person.blacklistReason?.trim() || "Yes"
                  : "No"
              }
            />
            <Detail
              label="NPA"
              value={person.npa ? person.npaReason?.trim() || "Yes" : "No"}
            />
          </dl>
        ) : customer.isError ? (
          <FormError>{(customer.error as Error).message}</FormError>
        ) : (
          <p className="lm-muted">No customer is attached to this request.</p>
        )}
      </div>

      <div className="lm-card">
        <h2>Loan</h2>
        {loan.isLoading ? <Skeleton /> : null}
        {loan.data ? (
          <>
            <dl className="lm-details">
              <Detail label="Loan number" value={loan.data.loanNumber} />
              <Detail label="Status" value={loan.data.status} />
              <Detail
                label="Branch"
                value={
                  loan.data.branch
                    ? `${loan.data.branch.name} (${loan.data.branch.code})`
                    : "—"
                }
              />
              <Detail
                label="Product"
                value={
                  loan.data.product
                    ? `${loan.data.product.name} (${loan.data.product.code})`
                    : "—"
                }
              />
              <Detail label="Principal" value={money(loan.data.principal)} />
              <Detail
                label="Rate"
                value={`${money(loan.data.annualRatePercent)}%`}
              />
              <Detail
                label="Penalty"
                value={
                  loan.data.penaltyDailyPercent != null
                    ? `${money(loan.data.penaltyDailyPercent)}% / day`
                    : "—"
                }
              />
              <Detail
                label="Tenure"
                value={`${loan.data.tenureInstallments} ${loan.data.frequency}`}
              />
              <Detail
                label="First EMI"
                value={loan.data.monthlyFirstEmiOption.replaceAll("_", " ")}
              />
              <Detail
                label="Processing fee"
                value={money(loan.data.processingFee)}
              />
              <Detail
                label="Overrides"
                value={
                  [
                    loan.data.productOverride ? "Product" : null,
                    loan.data.rateOverride ? "Rate" : null,
                    loan.data.tenureOverride ? "Tenure" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "None"
                }
              />
              <Detail
                label="Disbursed"
                value={dateOnly(loan.data.disbursementDate)}
              />
              <Detail
                label="Disbursement mode"
                value={loan.data.disbursementMode?.replaceAll("_", " ") ?? "—"}
              />
              <Detail
                label="Net disbursement"
                value={money(loan.data.netDisbursement)}
              />
              <Detail
                label="Advance balance"
                value={money(loan.data.advanceBalance)}
              />
              <Detail
                label="Restructures"
                value={String(loan.data.restructureCount ?? 0)}
              />
              <Detail
                label="Rejection"
                value={loan.data.rejectionReason?.trim() || "—"}
              />
            </dl>
            {canEditAmounts ? (
              <form
                className="lm-form"
                style={{ marginTop: "1.25rem" }}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAmounts.mutate();
                }}
              >
                <h3>Edit amount</h3>
                <FormInput
                  label="Principal"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amounts.principal}
                  onChange={(principal) =>
                    setAmounts((current) => ({ ...current, principal }))
                  }
                  required
                />
                <FormInput
                  label="Annual rate (%)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amounts.annualRatePercent}
                  onChange={(annualRatePercent) =>
                    setAmounts((current) => ({ ...current, annualRatePercent }))
                  }
                  required
                />
                <FormInput
                  label="Tenure (installments)"
                  type="number"
                  min="1"
                  step="1"
                  value={amounts.tenureInstallments}
                  onChange={(tenureInstallments) =>
                    setAmounts((current) => ({
                      ...current,
                      tenureInstallments,
                    }))
                  }
                  required
                />
                <FormInput
                  label="Processing fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amounts.processingFee}
                  onChange={(processingFee) =>
                    setAmounts((current) => ({ ...current, processingFee }))
                  }
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={saveAmounts.isPending}
                >
                  Save amount
                </Button>
              </form>
            ) : (
              <p className="lm-muted">
                Amount can be changed only before the loan is disbursed.
              </p>
            )}
          </>
        ) : loan.isError ? (
          <FormError>{(loan.error as Error).message}</FormError>
        ) : !loanKey ? (
          <p className="lm-muted">This request is not tied to a loan.</p>
        ) : null}
      </div>

      {loanKey ? (
        <div className="lm-card lm-table-wrap">
          <h2>EMI schedule</h2>
          {schedule.data?.projected ? (
            <p className="lm-muted">
              Dates assume disbursement today. Nothing has been collected yet.
            </p>
          ) : null}
          {schedule.isLoading ? <Skeleton /> : null}
          {schedule.isError ? (
            <FormError>{(schedule.error as Error).message}</FormError>
          ) : null}
          {schedule.data && schedule.data.rows.length > 0 ? (
            <Table<ScheduleRow>
              aria-label="EMI schedule"
              items={schedule.data.rows}
            >
              <TableHeader>
                <TableColumn id="number" isRowHeader>
                  #
                </TableColumn>
                <TableColumn id="due">Due</TableColumn>
                <TableColumn id="emi">EMI</TableColumn>
                <TableColumn id="paid">Paid</TableColumn>
                <TableColumn id="remaining">Remaining</TableColumn>
                <TableColumn id="status">Payment status</TableColumn>
              </TableHeader>
              <TableBody<ScheduleRow>>
                {(row) => {
                  const status = PAYMENT_STATUS[row.status] ?? {
                    label: row.status,
                    variant: "info" as const,
                  };
                  return (
                    <TableRow>
                      {(column) => (
                        <TableCell>
                          {column.id === "number" ? row.number : null}
                          {column.id === "due" ? row.dueDate : null}
                          {column.id === "emi" ? money(row.totalDue) : null}
                          {column.id === "paid" ? money(row.paid) : null}
                          {column.id === "remaining"
                            ? money(row.remaining)
                            : null}
                          {column.id === "status" ? (
                            <Badge variant={status.variant} appearance="subtle">
                              {status.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                }}
              </TableBody>
            </Table>
          ) : schedule.isSuccess ? (
            <Empty>
              <EmptyDescription>No installments yet.</EmptyDescription>
            </Empty>
          ) : null}
        </div>
      ) : null}

      {loanKey ? (
        <div className="lm-card lm-table-wrap">
          <h2>Payments</h2>
          {payments.isLoading ? <Skeleton /> : null}
          {payments.isError ? (
            <FormError>{(payments.error as Error).message}</FormError>
          ) : null}
          {payments.data && payments.data.length > 0 ? (
            <Table<PaymentRow> aria-label="Payments" items={payments.data}>
              <TableHeader>
                <TableColumn id="date" isRowHeader>
                  Date
                </TableColumn>
                <TableColumn id="receipt">Receipt</TableColumn>
                <TableColumn id="amount">Amount</TableColumn>
                <TableColumn id="mode">Mode</TableColumn>
                <TableColumn id="status">Status</TableColumn>
              </TableHeader>
              <TableBody<PaymentRow>>
                {(row) => (
                  <TableRow>
                    {(column) => (
                      <TableCell>
                        {column.id === "date"
                          ? dateOnly(row.paymentDate)
                          : null}
                        {column.id === "receipt"
                          ? (row.receiptNumber ?? row.reference ?? "—")
                          : null}
                        {column.id === "amount" ? money(row.amount) : null}
                        {column.id === "mode"
                          ? row.mode.replaceAll("_", " ")
                          : null}
                        {column.id === "status"
                          ? row.reversed
                            ? "Reversed"
                            : "Posted"
                          : null}
                      </TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : payments.isSuccess ? (
            <Empty>
              <EmptyDescription>No payments yet.</EmptyDescription>
            </Empty>
          ) : null}
        </div>
      ) : null}

      <DocumentList title="Loan documents" query={loanDocs} />
      <DocumentList title="Customer documents" query={customerDocs} />
    </div>
  );
}

function DocumentList({
  title,
  query,
}: {
  title: string;
  query: {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    error: Error | null;
    data: DocumentRow[] | undefined;
  };
}) {
  if (!query.isLoading && !query.isSuccess && !query.isError) return null;
  return (
    <div className="lm-card lm-table-wrap">
      <h2>{title}</h2>
      {query.isLoading ? <Skeleton /> : null}
      {query.isError ? (
        <FormError>
          {query.error?.message ?? "Could not load documents."}
        </FormError>
      ) : null}
      {query.data && query.data.length > 0 ? (
        <Table<DocumentRow> aria-label={title} items={query.data}>
          <TableHeader>
            <TableColumn id="kind" isRowHeader>
              Kind
            </TableColumn>
            <TableColumn id="file">File</TableColumn>
            <TableColumn id="uploaded">Uploaded</TableColumn>
          </TableHeader>
          <TableBody<DocumentRow>>
            {(doc) => (
              <TableRow>
                {(column) => (
                  <TableCell>
                    {column.id === "kind"
                      ? doc.kind.replaceAll("_", " ")
                      : null}
                    {column.id === "file" ? doc.fileName : null}
                    {column.id === "uploaded"
                      ? doc.createdAt
                        ? new Date(doc.createdAt).toLocaleString()
                        : "—"
                      : null}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : query.isSuccess ? (
        <Empty>
          <EmptyDescription>No documents yet.</EmptyDescription>
        </Empty>
      ) : null}
    </div>
  );
}

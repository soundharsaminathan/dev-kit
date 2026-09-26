import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormInput } from "@/modules/ui/form-fields";
import styles from "./loan-review.module.scss";

type Customer = {
  id: string;
  name: string;
  customerNumber?: string;
  mobile?: string;
  pan?: string;
  address?: string | null;
  blacklisted?: boolean;
  npa?: boolean;
};

type ReviewLoan = {
  id: string;
  loanNumber: string;
  status: string;
  principal: string | number;
  annualRatePercent: string | number;
  tenureInstallments: number;
  frequency: string;
  createdAt?: string;
  updatedAt?: string;
  disbursementDate?: string | null;
  processingFee?: string | number;
  customer?: Customer;
  product?: { id?: string; name: string; code?: string };
  branch?: { name: string; code?: string };
};

type Schedule = {
  projected?: boolean;
  outstanding: number;
  nextDueDate: string | null;
  nextEmi: number;
};

type DocumentRow = {
  id: string;
  kind: string;
  fileName: string;
  createdAt?: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  VERIFIED: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DISBURSED: "Disbursed",
  ACTIVE: "Active",
  CLOSED: "Closed",
  WRITTEN_OFF: "Written off",
};

const DOC_LABEL: Record<string, string> = {
  KYC_PHOTO_ID: "Photo ID",
  KYC_PAN: "PAN Card",
  KYC_ADDRESS: "Address Proof",
  LOAN_AGREEMENT: "Loan agreement",
  LOAN_SANCTION: "Sanction letter",
  PAYMENT_RECEIPT: "Payment receipt",
  OTHER: "Other document",
};

function inr(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) return "—";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function when(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function day(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function tenureLabel(count: number, frequency: string) {
  if (frequency === "WEEKLY") return `${count} weeks`;
  if (frequency === "BIWEEKLY") return `${count} fortnights`;
  if (frequency === "MONTHLY") return `${count} months`;
  return `${count} installments`;
}

function initial(name?: string) {
  return name?.trim().slice(0, 1).toUpperCase() || "?";
}

export function LoanReviewScreen({
  loan,
  canApprove,
  canReject,
  busy,
  error,
  message,
  onBack,
  onSchedule,
  onApprove,
  onReject,
  onSubmit,
  onVerify,
  onRequestApproval,
  history,
  documentsPanel,
}: {
  loan: ReviewLoan;
  canApprove: boolean;
  canReject: boolean;
  busy: boolean;
  error: string | null;
  message: string | null;
  onBack: () => void;
  onSchedule: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onSubmit?: (() => void) | undefined;
  onVerify?: (() => void) | undefined;
  onRequestApproval?: (() => void) | undefined;
  history: ReactNode;
  documentsPanel: ReactNode;
}) {
  const { api } = useAuth();
  const [tab, setTab] = useState("details");
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [held, setHeld] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);

  const customerId = loan.customer?.id;
  const schedule = useQuery({
    queryKey: ["loans", loan.id, "schedule"],
    queryFn: () => api.get<Schedule>(`/loans/${loan.id}/schedule`),
  });
  const loanDocs = useQuery({
    queryKey: ["documents", "LOAN", loan.id],
    queryFn: () =>
      api.get<DocumentRow[]>(
        `/documents?entityType=LOAN&entityId=${encodeURIComponent(loan.id)}`,
      ),
  });
  const customerDocs = useQuery({
    queryKey: ["documents", "CUSTOMER", customerId],
    enabled: Boolean(customerId),
    queryFn: () =>
      api.get<DocumentRow[]>(
        `/documents?entityType=CUSTOMER&entityId=${encodeURIComponent(customerId ?? "")}`,
      ),
  });

  const documents = [...(customerDocs.data ?? []), ...(loanDocs.data ?? [])];
  const statusLabel = STATUS_LABEL[loan.status] ?? loan.status;
  const underReview = loan.status === "VERIFIED" || loan.status === "SUBMITTED";
  const emi = schedule.data?.nextEmi ?? 0;
  const outstanding = schedule.data?.outstanding;

  const activity: Array<{ title: string; at: string | undefined; by: string }> =
    [];
  if (loan.createdAt) {
    activity.push({ title: "Loan created", at: loan.createdAt, by: "System" });
  }
  if (documents[0]?.createdAt) {
    activity.push({
      title: "Documents uploaded",
      at: documents[0].createdAt,
      by: loan.customer?.name ?? "Customer",
    });
  }
  if (underReview) {
    activity.push({
      title: "Under review",
      at: loan.updatedAt ?? loan.createdAt,
      by: "Reviewer",
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <button type="button" className={styles.back} onClick={onBack}>
            <Icon name="arrow-left" />
            Back to Loans
          </button>
          <div className={styles.titleRow}>
            <h1>{loan.loanNumber}</h1>
            <Badge
              appearance="subtle"
              variant={underReview ? "warning" : "info"}
            >
              {statusLabel}
            </Badge>
          </div>
          <p className={styles.subtitle}>
            {loan.customer?.name ?? "Customer"} · {loan.product?.name ?? "Loan"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button type="button" variant="outline" onClick={onSchedule}>
            <Icon name="calendar" />
            View EMI Schedule
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            <Icon name="download" />
            Download
          </Button>
          <div className={styles.menu}>
            <Button
              type="button"
              variant="outline"
              isIconOnly
              aria-label="More actions"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Icon name="more-horizontal" />
            </Button>
            {menuOpen ? (
              <div className={styles.menuList}>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setTab("history");
                  }}
                >
                  Loan history
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setTab("customer");
                  }}
                >
                  Customer profile
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Loan summary">
        <article className={styles.metric}>
          <span className={styles.avatar}>{initial(loan.customer?.name)}</span>
          <div>
            <strong>{loan.customer?.name ?? "—"}</strong>
            <small>Customer</small>
            <span>Customer ID: {loan.customer?.customerNumber ?? "—"}</span>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon}>
            <Icon name="tag" />
          </span>
          <div>
            <strong>{loan.product?.name ?? "—"}</strong>
            <small>Product</small>
            <span>Product ID: {loan.product?.code ?? "—"}</span>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon}>
            <Icon name="wallet" />
          </span>
          <div>
            <strong>{inr(loan.principal)}</strong>
            <small>Principal</small>
            <span>Loan amount</span>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon}>
            <Icon name="trending-up" />
          </span>
          <div>
            <strong>{inr(loan.annualRatePercent).replace("₹", "")}%</strong>
            <small>Rate ({loan.frequency.toLowerCase()})</small>
            <span>Interest rate</span>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon}>
            <Icon name="calendar" />
          </span>
          <div>
            <strong>
              {tenureLabel(loan.tenureInstallments, loan.frequency)}
            </strong>
            <small>Tenure</small>
            <span>Term</span>
          </div>
        </article>
        <article className={styles.metric}>
          <span className={styles.metricIcon}>
            <Icon name="clock" />
          </span>
          <div>
            <strong>{statusLabel}</strong>
            <small>Status</small>
            <span>Since {day(loan.createdAt)}</span>
          </div>
        </article>
      </section>

      <div className={styles.layout}>
        <div>
          <div className={styles.tabs} role="tablist">
            {(
              [
                ["details", "Review Details"],
                ["documents", "Documents"],
                ["customer", "Customer Profile"],
                ["history", "Loan History"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={styles.tab}
                role="tab"
                aria-selected={tab === id}
                data-active={tab === id ? "true" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <div className={styles.stack}>
              {error ? <p className="lm-error">{error}</p> : null}
              {message ? <p className="lm-muted">{message}</p> : null}
              <section className={styles.card}>
                <h2>Loan Details</h2>
                <dl className={styles.details}>
                  <div>
                    <dt>Loan ID</dt>
                    <dd>{loan.loanNumber}</dd>
                  </div>
                  <div>
                    <dt>Applied date</dt>
                    <dd>{when(loan.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Customer</dt>
                    <dd>{loan.customer?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Disbursal date</dt>
                    <dd>{day(loan.disbursementDate)}</dd>
                  </div>
                  <div>
                    <dt>Product</dt>
                    <dd>{loan.product?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>EMI amount</dt>
                    <dd>{emi > 0 ? inr(emi) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Principal amount</dt>
                    <dd>{inr(loan.principal)}</dd>
                  </div>
                  <div>
                    <dt>Next EMI date</dt>
                    <dd>{schedule.data?.nextDueDate ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Rate</dt>
                    <dd>{Number(loan.annualRatePercent)}%</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{loan.branch?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Tenure</dt>
                    <dd>
                      {tenureLabel(loan.tenureInstallments, loan.frequency)}
                    </dd>
                  </div>
                  <div>
                    <dt>Loan officer</dt>
                    <dd>—</dd>
                  </div>
                  <div>
                    <dt>Outstanding</dt>
                    <dd>
                      {outstanding != null && !schedule.data?.projected
                        ? inr(outstanding)
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className={styles.card}>
                <h2>Documents</h2>
                {documents.length === 0 ? (
                  <p className="lm-muted">No documents uploaded yet.</p>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className={styles.doc}>
                      <span className={styles.docIcon}>
                        <Icon name="file-text" />
                      </span>
                      <div>
                        <p>{DOC_LABEL[doc.kind] ?? doc.fileName}</p>
                        <small>{doc.fileName}</small>
                      </div>
                      <Badge appearance="subtle" variant="success">
                        Uploaded
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        View
                      </Button>
                    </div>
                  ))
                )}
                {selectedDoc ? (
                  <p className="lm-muted">
                    {DOC_LABEL[selectedDoc.kind] ?? selectedDoc.kind}:{" "}
                    {selectedDoc.fileName}
                    {selectedDoc.createdAt
                      ? ` · uploaded ${when(selectedDoc.createdAt)}`
                      : ""}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          {tab === "documents" ? (
            <div className={styles.stack}>{documentsPanel}</div>
          ) : null}

          {tab === "customer" ? (
            <div className={styles.stack}>
              <section className={styles.card}>
                <h2>Customer Profile</h2>
                <dl className={styles.details}>
                  <div>
                    <dt>Name</dt>
                    <dd>{loan.customer?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Customer ID</dt>
                    <dd>{loan.customer?.customerNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>{loan.customer?.mobile ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>PAN</dt>
                    <dd>{loan.customer?.pan ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Address</dt>
                    <dd>{loan.customer?.address?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt>Flags</dt>
                    <dd>
                      {[
                        loan.customer?.blacklisted ? "Blacklisted" : null,
                        loan.customer?.npa ? "NPA" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "None"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          ) : null}

          {tab === "history" ? (
            <div className={styles.stack}>{history}</div>
          ) : null}
        </div>

        <aside className={styles.aside}>
          <section className={styles.card}>
            <h2>Review Decision</h2>
            <p className={styles.note}>
              Please review the loan details and documents before taking a
              decision.
            </p>
            {held ? (
              <p className="lm-muted">
                Held for this review. The loan stays {statusLabel.toLowerCase()}
                .
              </p>
            ) : null}
            <div className={styles.decisionActions}>
              {loan.status === "DRAFT" && onSubmit ? (
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={busy}
                  onClick={onSubmit}
                >
                  <Icon name="check" />
                  Submit
                </Button>
              ) : null}
              {loan.status === "SUBMITTED" && onVerify ? (
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={busy}
                  onClick={onVerify}
                >
                  <Icon name="check" />
                  Verify
                </Button>
              ) : null}
              {loan.status === "VERIFIED" && onRequestApproval ? (
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={busy}
                  onClick={onRequestApproval}
                >
                  Request approval
                </Button>
              ) : null}
              {canApprove ? (
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={busy}
                  onClick={onApprove}
                >
                  <Icon name="check" />
                  Approve
                </Button>
              ) : null}
              {canReject ? (
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={busy}
                  onClick={() => setRejecting((open) => !open)}
                >
                  <Icon name="x" />
                  Reject
                </Button>
              ) : null}
            </div>
            {rejecting ? (
              <form
                className="lm-form"
                style={{ marginTop: "16px" }}
                onSubmit={(event) => {
                  event.preventDefault();
                  onReject(reason.trim());
                }}
              >
                <FormInput
                  label="Reject reason"
                  value={reason}
                  onChange={setReason}
                  required
                />
                <Button
                  type="submit"
                  variant="danger"
                  isDisabled={busy || !reason.trim()}
                >
                  Confirm reject
                </Button>
              </form>
            ) : null}
            <Button
              type="button"
              variant="outline"
              style={{ width: "100%", marginTop: "8px" }}
              onClick={() => setHeld(true)}
            >
              <Icon name="clock" />
              Hold
            </Button>
          </section>

          <section className={styles.card}>
            <h2>Quick Summary</h2>
            <div className={styles.summaryRow}>
              <span>Loan amount</span>
              <strong>{inr(loan.principal)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Tenure</span>
              <strong>
                {tenureLabel(loan.tenureInstallments, loan.frequency)}
              </strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Monthly EMI</span>
              <strong>{emi > 0 ? inr(emi) : "—"}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Interest rate</span>
              <strong>{Number(loan.annualRatePercent)}%</strong>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Recent Activity</h2>
            <ul className={styles.activity}>
              {activity.map((item) => (
                <li key={item.title}>
                  <span className={styles.dot} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {when(item.at)} · By {item.by}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

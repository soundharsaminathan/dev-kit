import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Heading } from "@dev-ui/components/heading";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { COLLECTION_PAGE_ROLES, roleAllowed } from "@/lib/page-access";
import { FormError } from "@/modules/ui/controls";

type ScheduleRow = {
  id: string;
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
  loanId: string;
  loanNumber: string;
  customerName: string;
  customerId: string;
  loanStatus: string;
  frequency: string;
  paidCount: number;
  installmentCount: number;
  outstanding: number;
  nextDueDate: string | null;
  nextEmi: number;
  rows: ScheduleRow[];
};

const STATUS_LABEL: Record<
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

function money(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusOf(status: string) {
  return STATUS_LABEL[status] ?? { label: status, variant: "info" as const };
}

export const Route = createFileRoute("/app/loans/$id_/schedule")({
  component: LoanSchedulePage,
});

function LoanSchedulePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const canCollect = roleAllowed(user?.role, COLLECTION_PAGE_ROLES);

  const schedule = useQuery({
    queryKey: ["loans", id, "schedule"],
    queryFn: () => api.get<LoanSchedule>(`/loans/${id}/schedule`),
  });

  if (schedule.isLoading) {
    return (
      <div className="lm-page">
        <Skeleton />
      </div>
    );
  }

  if (schedule.isError || !schedule.data) {
    return (
      <FormError>
        {(schedule.error as Error)?.message ??
          "Could not load the EMI schedule."}
      </FormError>
    );
  }

  const data = schedule.data;
  const openRows = data.rows.filter(
    (row) =>
      row.status === "PENDING" ||
      row.status === "PARTIAL" ||
      row.status === "OVERDUE",
  );

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <Heading level={1}>EMI schedule</Heading>
          <p>
            {data.loanNumber} · {data.customerName} · {data.frequency}
          </p>
        </div>
        <div className="lm-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate({
                to: "/app/loans/$id",
                params: { id: data.loanId },
              })
            }
          >
            Loan
          </Button>
          {canCollect && !data.projected && openRows.length > 0 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                void navigate({
                  to: "/app/collections",
                  search: { loanId: data.loanId },
                })
              }
            >
              <Icon name="credit-card" />
              Record payment
            </Button>
          ) : null}
        </div>
      </div>

      {data.projected ? (
        <p className="lm-muted">
          Dates assume disbursement today. Payment status stays not started
          until the loan is disbursed and collections begin.
        </p>
      ) : null}

      <div className="lm-grid-stats">
        <div className="lm-stat">
          <strong>
            {data.paidCount} / {data.installmentCount}
          </strong>
          <span>Installments paid</span>
        </div>
        <div className="lm-stat">
          <strong>{money(data.outstanding)}</strong>
          <span>Outstanding</span>
        </div>
        <div className="lm-stat">
          <strong>{data.nextDueDate ?? "—"}</strong>
          <span>Next due</span>
        </div>
        <div className="lm-stat">
          <strong>{data.nextEmi > 0 ? money(data.nextEmi) : "—"}</strong>
          <span>Next EMI</span>
        </div>
      </div>

      <div className="lm-card lm-table-wrap">
        <Table<ScheduleRow>
          aria-label="EMI schedule"
          items={data.rows.map((row) => ({
            ...row,
            id: row.id || String(row.number),
          }))}
        >
          <TableHeader>
            <TableColumn id="number" isRowHeader>
              #
            </TableColumn>
            <TableColumn id="due">Due</TableColumn>
            <TableColumn id="principal">Principal</TableColumn>
            <TableColumn id="interest">Interest</TableColumn>
            <TableColumn id="penalty">Penalty</TableColumn>
            <TableColumn id="emi">EMI</TableColumn>
            <TableColumn id="paid">Paid</TableColumn>
            <TableColumn id="remaining">Remaining</TableColumn>
            <TableColumn id="status">Payment status</TableColumn>
          </TableHeader>
          <TableBody<ScheduleRow>>
            {(row) => {
              const status = statusOf(row.status);
              return (
                <TableRow>
                  {(column) => (
                    <TableCell>
                      {column.id === "number" ? row.number : null}
                      {column.id === "due" ? row.dueDate : null}
                      {column.id === "principal"
                        ? money(row.principalDue)
                        : null}
                      {column.id === "interest" ? money(row.interestDue) : null}
                      {column.id === "penalty" ? money(row.penaltyDue) : null}
                      {column.id === "emi" ? money(row.totalDue) : null}
                      {column.id === "paid" ? money(row.paid) : null}
                      {column.id === "remaining" ? money(row.remaining) : null}
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
      </div>
    </div>
  );
}

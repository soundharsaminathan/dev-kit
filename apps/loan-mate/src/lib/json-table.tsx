import { Empty, EmptyDescription } from "@dev-ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";

type JsonTableProps = {
  data: unknown;
  emptyLabel?: string;
};

type JsonRow = {
  id: string;
  cells: Record<string, unknown>;
};

function asRows(data: unknown): JsonRow[] {
  const source = Array.isArray(data)
    ? data.filter(
        (row): row is Record<string, unknown> =>
          typeof row === "object" && row !== null && !Array.isArray(row),
      )
    : typeof data === "object" && data !== null
      ? [data as Record<string, unknown>]
      : [];

  return source.map((row, index) => ({
    id: String(row.id ?? row.loanId ?? row.customerNumber ?? index),
    cells: row,
  }));
}

export function JsonTable({ data, emptyLabel = "No rows." }: JsonTableProps) {
  const rows = asRows(data);
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyDescription>{emptyLabel}</EmptyDescription>
      </Empty>
    );
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row.cells)))];

  return (
    <Table<JsonRow> aria-label="Report" items={rows}>
      <TableHeader>
        {columns.map((column, index) => (
          <TableColumn
            key={column}
            id={column}
            {...(index === 0 ? { isRowHeader: true } : {})}
          >
            {column}
          </TableColumn>
        ))}
      </TableHeader>
      <TableBody<JsonRow>>
        {(row) => (
          <TableRow>
            {(column) => (
              <TableCell>{formatCell(row.cells[String(column.id)])}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

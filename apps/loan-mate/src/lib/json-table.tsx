type JsonTableProps = {
  data: unknown;
  emptyLabel?: string;
};

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null && !Array.isArray(row),
    );
  }
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return [data as Record<string, unknown>];
  }
  return [];
}

export function JsonTable({ data, emptyLabel = "No rows." }: JsonTableProps) {
  const rows = asRows(data);
  if (rows.length === 0) {
    return <p className="lm-muted">{emptyLabel}</p>;
  }
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    <div className="lm-table-wrap">
      <table className="lm-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = String(
              row.id ?? row.loanId ?? row.customerNumber ?? JSON.stringify(row),
            );
            return (
              <tr key={key}>
                {columns.map((col) => (
                  <td key={col}>{formatCell(row[col])}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

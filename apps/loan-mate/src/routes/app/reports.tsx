import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { JsonTable } from "@/lib/json-table";

const REPORTS = [
  { id: "portfolio", label: "Portfolio", path: "/reports/portfolio" },
  { id: "overdue", label: "Overdue", path: "/reports/overdue" },
  { id: "npa", label: "NPA", path: "/reports/npa" },
  { id: "collections", label: "Collections", path: "/reports/collections" },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { api } = useAuth();
  const [active, setActive] = useState<ReportId>("portfolio");
  const report = REPORTS.find((r) => r.id === active)!;

  const data = useQuery({
    queryKey: ["reports", active],
    queryFn: () => api.get<unknown>(report.path),
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Reports</h1>
          <p>Operational snapshots from the API.</p>
        </div>
      </div>

      <div
        className="lm-actions"
        style={{ flexWrap: "wrap", marginBottom: "1rem" }}
      >
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={active === r.id ? "lm-btn" : "lm-btn lm-btn-secondary"}
            onClick={() => setActive(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="lm-card">
        <h2>{report.label}</h2>
        {data.isLoading ? <p>Loading…</p> : null}
        {data.isError ? (
          <p className="lm-error">{(data.error as Error).message}</p>
        ) : null}
        {data.data != null ? <JsonTable data={data.data} /> : null}
      </div>
    </div>
  );
}

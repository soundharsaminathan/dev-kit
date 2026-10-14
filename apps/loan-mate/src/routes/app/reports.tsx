import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { JsonTable } from "@/lib/json-table";
import { FormError, FormInput } from "@/modules/ui/form-fields";

const REPORTS = [
  { id: "portfolio", label: "Portfolio", path: "/reports/portfolio" },
  { id: "overdue", label: "Overdue", path: "/reports/overdue" },
  { id: "npa", label: "NPA", path: "/reports/npa" },
  { id: "collections", label: "Collections", path: "/reports/collections" },
  {
    id: "staff-performance",
    label: "Staff performance",
    path: "/users/performance",
  },
] as const;

type ReportId = (typeof REPORTS)[number]["id"];

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { api } = useAuth();
  const [active, setActive] = useState<ReportId>("portfolio");
  const defaults = useMemo(() => monthRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const report = REPORTS.find((r) => r.id === active)!;
  const needsRange = active === "collections" || active === "staff-performance";

  const data = useQuery({
    queryKey: ["reports", active, from, to],
    queryFn: () => {
      if (active === "staff-performance") {
        return api.get<unknown>(
          `/users/performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
      }
      if (active === "collections") {
        return api.get<unknown>(
          `${report.path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
      }
      return api.get<unknown>(report.path);
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Reports</h1>
          <p>Operational snapshots from the API.</p>
        </div>
      </div>

      <Tabs
        aria-label="Reports"
        selectedKey={active}
        onSelectionChange={(key) => {
          if (key != null) setActive(String(key) as ReportId);
        }}
      >
        <TabList variant="line" className="lm-tab-list">
          {REPORTS.map((item) => (
            <Tab key={item.id} id={item.id}>
              {item.label}
            </Tab>
          ))}
        </TabList>
        <TabPanel id={active}>
          {needsRange ? (
            <div className="lm-actions" style={{ marginBottom: "1rem" }}>
              <FormInput
                label="From"
                type="date"
                value={from}
                onChange={setFrom}
              />
              <FormInput label="To" type="date" value={to} onChange={setTo} />
            </div>
          ) : null}
          <div className="lm-card">
            <h2>{report.label}</h2>
            {data.isLoading ? <p>Loading…</p> : null}
            {data.isError ? (
              <FormError>{(data.error as Error).message}</FormError>
            ) : null}
            {data.data != null ? <JsonTable data={data.data} /> : null}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}

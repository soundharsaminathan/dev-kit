import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ADVANCE_TREATMENTS, type AdvanceTreatment } from "@/lib/constants";
import { useCompanyId } from "@/lib/use-company-id";

type CompanyResponse = {
  id: string;
  settings?: {
    graceDays?: number;
    penaltyDailyPercent?: string | number;
    defaultMonthlyFirstEmiOption?: string;
    defaultAdvanceTreatments?: AdvanceTreatment[];
    foreclosureChargePercent?: string | number;
    maxRestructures?: number;
  };
};

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { api } = useAuth();
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    graceDays: "0",
    penaltyDailyPercent: "0.1",
    defaultMonthlyFirstEmiOption: "EXACT_DAY",
    foreclosureChargePercent: "0",
    maxRestructures: "3",
    defaultAdvanceTreatments: [] as AdvanceTreatment[],
  });

  const settings = useQuery({
    queryKey: ["companies", companyId],
    enabled: Boolean(companyId),
    queryFn: () => api.get<CompanyResponse>(`/companies/${companyId}`),
  });

  useEffect(() => {
    if (!settings.data?.settings) return;
    const s = settings.data.settings;
    setForm({
      graceDays: String(s.graceDays ?? 0),
      penaltyDailyPercent: String(s.penaltyDailyPercent ?? 0.1),
      defaultMonthlyFirstEmiOption:
        s.defaultMonthlyFirstEmiOption ?? "EXACT_DAY",
      foreclosureChargePercent: String(s.foreclosureChargePercent ?? 0),
      maxRestructures: String(s.maxRestructures ?? 3),
      defaultAdvanceTreatments: s.defaultAdvanceTreatments ?? [
        ...ADVANCE_TREATMENTS,
      ],
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/companies/${companyId}/settings`, {
        graceDays: Number(form.graceDays),
        penaltyDailyPercent: Number(form.penaltyDailyPercent),
        defaultMonthlyFirstEmiOption: form.defaultMonthlyFirstEmiOption,
        foreclosureChargePercent: Number(form.foreclosureChargePercent),
        maxRestructures: Number(form.maxRestructures),
        defaultAdvanceTreatments: form.defaultAdvanceTreatments,
      }),
    onSuccess: async () => {
      setError(null);
      setSuccess("Settings saved.");
      await queryClient.invalidateQueries({
        queryKey: ["companies", companyId],
      });
    },
    onError: (err) => {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "Save failed");
    },
  });

  if (!companyId) {
    return <p className="lm-error">No company on this user.</p>;
  }

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Settings</h1>
          <p>
            Company penalty and grace — overdue starts the day after due date.
            Grace delays penalty only.
          </p>
        </div>
      </div>

      <div className="lm-card">
        {settings.isLoading ? <p>Loading…</p> : null}
        <form
          className="lm-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="lm-form-row">
            <label htmlFor="graceDays">Grace days (delays penalty only)</label>
            <input
              id="graceDays"
              type="number"
              min={0}
              value={form.graceDays}
              onChange={(e) =>
                setForm((f) => ({ ...f, graceDays: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="penalty">Default penalty daily rate (%)</label>
            <input
              id="penalty"
              type="number"
              step="0.001"
              value={form.penaltyDailyPercent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  penaltyDailyPercent: e.target.value,
                }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="foreclosure">Foreclosure charge (%)</label>
            <input
              id="foreclosure"
              type="number"
              step="0.01"
              value={form.foreclosureChargePercent}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  foreclosureChargePercent: e.target.value,
                }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="maxRestructures">Max restructures</label>
            <input
              id="maxRestructures"
              type="number"
              min={0}
              value={form.maxRestructures}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxRestructures: e.target.value }))
              }
            />
          </div>
          <div className="lm-form-row">
            <label htmlFor="firstEmi">Default first EMI option</label>
            <select
              id="firstEmi"
              value={form.defaultMonthlyFirstEmiOption}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  defaultMonthlyFirstEmiOption: e.target.value,
                }))
              }
            >
              <option value="EXACT_DAY">Exact day</option>
              <option value="CONVERT_TO_1ST_PARTIAL">
                Convert to 1st + partial
              </option>
              <option value="CONVERT_TO_1ST_NEXT_MONTH">
                Convert to 1st next month
              </option>
            </select>
          </div>
          <div className="lm-form-row">
            <span>Default advance treatments</span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {ADVANCE_TREATMENTS.map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={form.defaultAdvanceTreatments.includes(t)}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        defaultAdvanceTreatments: e.target.checked
                          ? [...f.defaultAdvanceTreatments, t]
                          : f.defaultAdvanceTreatments.filter((x) => x !== t),
                      }));
                    }}
                  />{" "}
                  {t.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          {success ? (
            <p style={{ color: "var(--lm-success)" }}>{success}</p>
          ) : null}
          <button type="submit" className="lm-btn" disabled={save.isPending}>
            Save settings
          </button>
        </form>
      </div>
    </div>
  );
}

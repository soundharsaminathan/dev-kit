import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCompanyId } from "@/lib/use-company-id";

type CompanyResponse = {
  id: string;
  name: string;
  settings?: {
    graceDays?: number;
    penaltyDailyPercent?: string | number;
    defaultMonthlyFirstEmiOption?: string;
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
  });

  const settings = useQuery({
    queryKey: ["companies", companyId],
    enabled: Boolean(companyId),
    queryFn: () => api.get<CompanyResponse>(`/companies/${companyId}`),
  });

  useEffect(() => {
    if (!settings.data?.settings) return;
    setForm({
      graceDays: String(settings.data.settings.graceDays ?? 0),
      penaltyDailyPercent: String(
        settings.data.settings.penaltyDailyPercent ?? 0.1,
      ),
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/companies/${companyId}/settings`, {
        graceDays: Number(form.graceDays),
        penaltyDailyPercent: Number(form.penaltyDailyPercent),
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

import { Button } from "@dev-ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ADVANCE_TREATMENTS, type AdvanceTreatment } from "@/lib/constants";
import { useCompanyId } from "@/lib/use-company-id";
import { FormCheckbox, FormInput, FormSelect } from "@/modules/ui/form-fields";

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
          <FormInput
            label="Grace days (delays penalty only)"
            type="number"
            min={0}
            value={form.graceDays}
            onChange={(graceDays) => setForm((f) => ({ ...f, graceDays }))}
          />
          <FormInput
            label="Default penalty daily rate (%)"
            type="number"
            step="0.001"
            value={form.penaltyDailyPercent}
            onChange={(penaltyDailyPercent) =>
              setForm((f) => ({ ...f, penaltyDailyPercent }))
            }
          />
          <FormInput
            label="Foreclosure charge (%)"
            type="number"
            step="0.01"
            value={form.foreclosureChargePercent}
            onChange={(foreclosureChargePercent) =>
              setForm((f) => ({ ...f, foreclosureChargePercent }))
            }
          />
          <FormInput
            label="Max restructures"
            type="number"
            min={0}
            value={form.maxRestructures}
            onChange={(maxRestructures) =>
              setForm((f) => ({ ...f, maxRestructures }))
            }
          />
          <FormSelect
            label="Default first EMI option"
            value={form.defaultMonthlyFirstEmiOption}
            onChange={(defaultMonthlyFirstEmiOption) =>
              setForm((f) => ({ ...f, defaultMonthlyFirstEmiOption }))
            }
            options={[
              { value: "EXACT_DAY", label: "Exact day" },
              {
                value: "CONVERT_TO_1ST_PARTIAL",
                label: "Convert to 1st + partial",
              },
              {
                value: "CONVERT_TO_1ST_NEXT_MONTH",
                label: "Convert to 1st next month",
              },
            ]}
          />
          <div className="lm-form-row">
            <span>Default advance treatments</span>
            {ADVANCE_TREATMENTS.map((t) => (
              <FormCheckbox
                key={t}
                label={t.replaceAll("_", " ")}
                isSelected={form.defaultAdvanceTreatments.includes(t)}
                onChange={(checked) => {
                  setForm((f) => ({
                    ...f,
                    defaultAdvanceTreatments: checked
                      ? [...f.defaultAdvanceTreatments, t]
                      : f.defaultAdvanceTreatments.filter((x) => x !== t),
                  }));
                }}
              />
            ))}
          </div>
          {error ? <p className="lm-error">{error}</p> : null}
          {success ? (
            <p style={{ color: "var(--lm-success)" }}>{success}</p>
          ) : null}
          <Button type="submit" variant="primary" isDisabled={save.isPending}>
            Save settings
          </Button>
        </form>
      </div>
    </div>
  );
}

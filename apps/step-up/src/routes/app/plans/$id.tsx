import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ApiState } from "@/modules/ui/api-state";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";

type PlanType = "FIXED_BATCH" | "UNLIMITED_KIDS" | "UNLIMITED_ADULTS";
type BillingCadence = "MONTHLY" | "FULL_BATCH";

type Plan = {
  id: string;
  name: string;
  type: PlanType;
  billingCadence: BillingCadence;
  priceMonthly: number | string;
  classCredits?: number | null;
  active: boolean;
};

export const Route = createFileRoute("/app/plans/$id")({
  component: EditPlanPage,
});

function EditPlanPage() {
  const { id } = Route.useParams();
  const api = useApi();

  const query = useQuery({
    queryKey: ["plan", id],
    queryFn: () => api.get<Plan>(`/plans/${id}`),
  });

  return (
    <section className="page stack">
      <PageHeader
        title="Edit plan"
        description="Update membership pricing and credits."
        actions={
          <Button as={Link} to="/app/plans" variant="quiet">
            Cancel
          </Button>
        }
      />

      <ApiState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        emptyTitle="Plan not found"
        emptyDescription="This plan is unavailable."
      >
        {(plan) => <EditPlanForm key={plan.id} plan={plan} />}
      </ApiState>
    </section>
  );
}

function EditPlanForm({ plan }: { plan: Plan }) {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [name, setName] = useState(plan.name);
  const [billingCadence, setBillingCadence] = useState<BillingCadence>(
    plan.billingCadence ?? "MONTHLY",
  );
  const [price, setPrice] = useState(String(plan.priceMonthly));
  const [classCredits, setClassCredits] = useState(
    plan.classCredits != null ? String(plan.classCredits) : "",
  );
  const [active, setActive] = useState(plan.active ? "true" : "false");

  const priceLabel =
    billingCadence === "FULL_BATCH" ? "Price (₹ full batch)" : "Price (₹/mo)";

  const updatePlan = useMutation({
    mutationFn: () =>
      api.patch<Plan>(`/plans/${plan.id}`, {
        name,
        billingCadence,
        priceMonthly: Number(price),
        active: active === "true",
        ...(plan.type === "FIXED_BATCH" && classCredits
          ? { classCredits: Number(classCredits) }
          : {}),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plans", STUDIO_ID] }),
        queryClient.invalidateQueries({ queryKey: ["plan", plan.id] }),
      ]);
      await navigate({ to: "/app/plans" });
    },
  });

  return (
    <div className="stack">
      <FormInput label="Name" value={name} onChange={setName} />
      <Select label="Type" selectedKey={plan.type} isDisabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="FIXED_BATCH">Fixed batch</SelectItem>
          <SelectItem id="UNLIMITED_KIDS">Unlimited kids</SelectItem>
          <SelectItem id="UNLIMITED_ADULTS">Unlimited adults</SelectItem>
        </SelectContent>
      </Select>
      <Select
        label="Billing cadence"
        selectedKey={billingCadence}
        onSelectionChange={(key) => setBillingCadence(key as BillingCadence)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="MONTHLY">Monthly</SelectItem>
          <SelectItem id="FULL_BATCH">Full batch</SelectItem>
        </SelectContent>
      </Select>
      <FormInput
        label={priceLabel}
        type="number"
        min="0"
        value={price}
        onChange={setPrice}
      />
      {plan.type === "FIXED_BATCH" ? (
        <FormInput
          label="Class credits"
          type="number"
          min="1"
          value={classCredits}
          onChange={setClassCredits}
        />
      ) : null}
      <Select
        label="Status"
        selectedKey={active}
        onSelectionChange={(key) => setActive(key as string)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem id="true">Active</SelectItem>
          <SelectItem id="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="primary"
        onClick={() => updatePlan.mutate()}
        isPending={updatePlan.isPending}
        isDisabled={!name.trim() || Number(price) < 0}
      >
        Save changes
      </Button>
    </div>
  );
}

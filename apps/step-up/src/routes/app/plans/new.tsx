import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";

type PlanType = "FIXED_BATCH" | "UNLIMITED_KIDS" | "UNLIMITED_ADULTS";
type BillingCadence = "MONTHLY" | "FULL_BATCH";

type Plan = {
  id: string;
  name: string;
};

export const Route = createFileRoute("/app/plans/new")({
  component: NewPlanPage,
});

function NewPlanPage() {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<PlanType>("UNLIMITED_KIDS");
  const [billingCadence, setBillingCadence] =
    useState<BillingCadence>("MONTHLY");
  const [price, setPrice] = useState("2999");

  const priceLabel =
    billingCadence === "FULL_BATCH" ? "Price (₹ full batch)" : "Price (₹/mo)";

  const createPlan = useMutation({
    mutationFn: () =>
      api.post<Plan>("/plans", {
        studioId: STUDIO_ID,
        name,
        type,
        billingCadence,
        priceMonthly: Number(price),
        classCredits: type === "FIXED_BATCH" ? 8 : undefined,
        active: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plans", STUDIO_ID] });
      await navigate({ to: "/app/plans" });
    },
  });

  return (
    <section className="page stack">
      <PageHeader
        title="New plan"
        description="Define membership pricing and credits."
        actions={
          <Button as={Link} to="/app/plans" variant="quiet">
            Cancel
          </Button>
        }
      />

      <div className="stack">
        <FormInput label="Name" value={name} onChange={setName} />
        <Select
          label="Type"
          selectedKey={type}
          onSelectionChange={(key) => setType(key as PlanType)}
        >
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
        <Button
          variant="primary"
          onClick={() => createPlan.mutate()}
          isPending={createPlan.isPending}
          isDisabled={!name.trim() || Number(price) < 0}
        >
          Create plan
        </Button>
      </div>
    </section>
  );
}

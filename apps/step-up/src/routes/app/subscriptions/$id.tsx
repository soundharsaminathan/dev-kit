import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ApiState } from "@/modules/ui/api-state";
import { FormInput } from "@/modules/ui/form-input";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";

type SubscriptionKind = "INDIVIDUAL" | "FAMILY";
type IndividualAudience = "ADULT" | "KID";
type FamilyPack =
  | "TWO_KIDS"
  | "ONE_ADULT_ONE_KID"
  | "TWO_ADULTS"
  | "ONE_ADULT_TWO_KIDS"
  | "TWO_ADULTS_ONE_KID"
  | "TWO_ADULTS_TWO_KIDS";
type BillingCadence = "MONTHLY" | "QUARTERLY";

type Subscription = {
  id: string;
  name: string;
  kind: SubscriptionKind;
  individualAudience?: IndividualAudience | null;
  familyPack?: FamilyPack | null;
  billingCadence: BillingCadence;
  price: number | string;
  adultSeats: number;
  kidSeats: number;
  active: boolean;
};

export const Route = createFileRoute("/app/subscriptions/$id")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: EditSubscriptionPage,
});

function EditSubscriptionPage() {
  const { id } = Route.useParams();
  const api = useApi();

  const query = useQuery({
    queryKey: ["subscription", id],
    queryFn: () => api.get<Subscription>(`/subscriptions/${id}`),
  });

  return (
    <Screen
      title="Edit subscription"
      subtitle="Pricing and status"
      showBack
      backTo="/app/subscriptions"
      actions={
        <Button as={Link} to="/app/subscriptions" variant="quiet" size="sm">
          Cancel
        </Button>
      }
    >
      <ApiState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        emptyTitle="Subscription not found"
        emptyDescription="This subscription is unavailable."
      >
        {(subscription) => (
          <EditSubscriptionForm
            key={subscription.id}
            subscription={subscription}
          />
        )}
      </ApiState>
    </Screen>
  );
}

function EditSubscriptionForm({
  subscription,
}: {
  subscription: Subscription;
}) {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("EditSubscriptionForm");
  const [name, setName] = useState(subscription.name);
  const [billingCadence, setBillingCadence] = useState<BillingCadence>(
    subscription.billingCadence ?? "MONTHLY",
  );
  const [price, setPrice] = useState(String(subscription.price));
  const [active, setActive] = useState(subscription.active ? "true" : "false");

  const priceLabel =
    billingCadence === "QUARTERLY" ? "Price (₹/qtr)" : "Price (₹/mo)";

  const kindDetail =
    subscription.kind === "INDIVIDUAL"
      ? subscription.individualAudience === "KID"
        ? "Kid"
        : "Adult"
      : (() => {
          switch (subscription.familyPack) {
            case "TWO_KIDS":
              return "2 kids";
            case "ONE_ADULT_ONE_KID":
              return "1 adult + 1 kid";
            case "TWO_ADULTS":
              return "2 adults";
            case "ONE_ADULT_TWO_KIDS":
              return "1 adult + 2 kids";
            case "TWO_ADULTS_ONE_KID":
              return "2 adults + 1 kid";
            case "TWO_ADULTS_TWO_KIDS":
              return "2 adults + 2 kids";
            default:
              return "Family";
          }
        })();

  const updateSubscription = useMutation({
    mutationFn: () =>
      api.patch<Subscription>(`/subscriptions/${subscription.id}`, {
        name,
        billingCadence,
        price: Number(price),
        active: active === "true",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["subscription", subscription.id],
        }),
      ]);
      toast({
        title: "Subscription saved",
        description: "Membership plan updated.",
        variant: "success",
      });
      await navigate({ to: "/app/subscriptions" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save subscription",
        description:
          error instanceof Error
            ? error.message
            : "The subscription could not be saved.",
        variant: "error",
      });
    },
  });

  return (
    <div className={staff.softPanel}>
      <div className={staff.sheetStack}>
        <FormInput label="Name" value={name} onChange={setName} />
        <Select label="Kind" selectedKey={subscription.kind} isDisabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem id="INDIVIDUAL">Individual</SelectItem>
            <SelectItem id="FAMILY">Family</SelectItem>
          </SelectContent>
        </Select>
        <FormInput
          label={subscription.kind === "FAMILY" ? "Family pack" : "Audience"}
          value={kindDetail}
          onChange={() => undefined}
          disabled
        />
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
            <SelectItem id="QUARTERLY">Quarterly</SelectItem>
          </SelectContent>
        </Select>
        <FormInput
          label={priceLabel}
          type="number"
          min="0"
          value={price}
          onChange={setPrice}
        />
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
          onClick={() => updateSubscription.mutate()}
          isPending={updateSubscription.isPending}
          isDisabled={!name.trim() || Number(price) < 0}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}

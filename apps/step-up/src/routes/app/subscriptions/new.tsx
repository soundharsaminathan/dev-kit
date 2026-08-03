import { Button } from "@dev-ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
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
};

export const Route = createFileRoute("/app/subscriptions/new")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: NewSubscriptionPage,
});

function NewSubscriptionPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("NewSubscriptionPage");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SubscriptionKind>("INDIVIDUAL");
  const [individualAudience, setIndividualAudience] =
    useState<IndividualAudience>("ADULT");
  const [familyPack, setFamilyPack] = useState<FamilyPack>("ONE_ADULT_ONE_KID");
  const [billingCadence, setBillingCadence] =
    useState<BillingCadence>("MONTHLY");
  const [price, setPrice] = useState("2999");

  const priceLabel =
    billingCadence === "QUARTERLY" ? "Price (₹/qtr)" : "Price (₹/mo)";

  const createSubscription = useMutation({
    mutationFn: () =>
      api.post<Subscription>("/subscriptions", {
        studioId,
        name,
        kind,
        billingCadence,
        price: Number(price),
        active: true,
        ...(kind === "INDIVIDUAL" ? { individualAudience } : { familyPack }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["subscriptions", studioId],
      });
      toast({
        title: "Subscription created",
        description: "New membership plan added.",
        variant: "success",
      });
      await navigate({ to: "/app/subscriptions" });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t create subscription",
        description:
          error instanceof Error
            ? error.message
            : "The subscription could not be created.",
        variant: "error",
      });
    },
  });

  return (
    <Screen
      title="New subscription"
      subtitle="Membership pricing and seats"
      showBack
      backTo="/app/subscriptions"
      actions={
        <Button as={Link} to="/app/subscriptions" variant="quiet" size="sm">
          Cancel
        </Button>
      }
    >
      <div className={staff.softPanel}>
        <div className={staff.sheetStack}>
          <FormInput label="Name" value={name} onChange={setName} />
          <Select
            label="Kind"
            selectedKey={kind}
            onSelectionChange={(key) => setKind(key as SubscriptionKind)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="INDIVIDUAL">Individual</SelectItem>
              <SelectItem id="FAMILY">Family</SelectItem>
            </SelectContent>
          </Select>
          {kind === "INDIVIDUAL" ? (
            <Select
              label="Audience"
              selectedKey={individualAudience}
              onSelectionChange={(key) =>
                setIndividualAudience(key as IndividualAudience)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="ADULT">Adult</SelectItem>
                <SelectItem id="KID">Kid</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Select
              label="Family pack"
              selectedKey={familyPack}
              onSelectionChange={(key) => setFamilyPack(key as FamilyPack)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="TWO_KIDS">2 kids</SelectItem>
                <SelectItem id="ONE_ADULT_ONE_KID">1 adult + 1 kid</SelectItem>
                <SelectItem id="TWO_ADULTS">2 adults</SelectItem>
                <SelectItem id="ONE_ADULT_TWO_KIDS">
                  1 adult + 2 kids
                </SelectItem>
                <SelectItem id="TWO_ADULTS_ONE_KID">
                  2 adults + 1 kid
                </SelectItem>
                <SelectItem id="TWO_ADULTS_TWO_KIDS">
                  2 adults + 2 kids
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            label="Billing cadence"
            selectedKey={billingCadence}
            onSelectionChange={(key) =>
              setBillingCadence(key as BillingCadence)
            }
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
          <Button
            variant="primary"
            onClick={() => createSubscription.mutate()}
            isPending={createSubscription.isPending}
            isDisabled={!name.trim() || Number(price) < 0}
          >
            Create subscription
          </Button>
        </div>
      </div>
    </Screen>
  );
}

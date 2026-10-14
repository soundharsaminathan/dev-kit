import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import {
  SubscriptionForm,
  type SubscriptionFormSubmit,
} from "@/modules/subscriptions/subscription-form";
import type { StudioSubscription } from "@/modules/subscriptions/subscription-types";
import { Screen } from "@/modules/ui/screen";

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

  const createSubscription = useMutation({
    mutationFn: (values: SubscriptionFormSubmit) =>
      api.post<StudioSubscription>("/subscriptions", {
        studioId,
        name: values.name,
        kind: "INDIVIDUAL",
        billingCadence: values.billingCadence,
        price: values.price,
        active: values.active,
        individualAudience: values.individualAudience,
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
    onError: (error: unknown) => {
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
      title="Add subscription"
      subtitle="Create a studio membership plan students can subscribe to."
      showBack
      backTo="/app/subscriptions"
      wide
    >
      <SubscriptionForm
        mode="create"
        isPending={createSubscription.isPending}
        onSubmit={(values) => createSubscription.mutate(values)}
      />
    </Screen>
  );
}

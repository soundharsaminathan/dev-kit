import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { unwrapPage } from "@/lib/api-page";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import type { Invoice } from "@/modules/payments/invoice-types";
import {
  activityFromInvoices,
  nextDuplicateName,
  subscribersFromInvoices,
} from "@/modules/subscriptions/subscription-model";
import type { StudioSubscription } from "@/modules/subscriptions/subscription-types";
import { SubscriptionsWorkspace } from "@/modules/subscriptions/subscriptions-workspace";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { TouchButton } from "@/modules/ui/touch-button";

export const Route = createFileRoute("/app/subscriptions/")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("SubscriptionsPage");
  const [subscriberPlan, setSubscriberPlan] =
    useState<StudioSubscription | null>(null);

  const query = useQuery({
    queryKey: ["subscriptions", studioId],
    queryFn: () =>
      api.get<StudioSubscription[]>(`/subscriptions/studio/${studioId}`),
  });

  const invoicesQuery = useQuery({
    queryKey: ["subscription-activity", studioId],
    enabled: Boolean(studioId),
    queryFn: () =>
      api.get<
        | Invoice[]
        | { items: Invoice[]; nextCursor: string | null; limit: number }
      >(`/billing/studio/${studioId}?limit=20`),
  });

  const invoices = unwrapPage(invoicesQuery.data);
  const activity = activityFromInvoices(invoices);

  const duplicatePlan = useMutation({
    mutationFn: (plan: StudioSubscription) =>
      api.post<StudioSubscription>("/subscriptions", {
        studioId,
        name: nextDuplicateName(
          plan.name,
          (query.data ?? []).map((item) => item.name),
        ),
        kind: "INDIVIDUAL",
        individualAudience: plan.individualAudience === "KID" ? "KID" : "ADULT",
        billingCadence:
          plan.billingCadence === "QUARTERLY" ? "QUARTERLY" : "MONTHLY",
        price: Number(plan.price),
        active: false,
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: ["subscriptions", studioId],
      });
      toast({
        title: "Plan duplicated",
        description: `${created.name} was added as a draft.`,
        variant: "success",
      });
      await navigate({
        to: "/app/subscriptions/$id",
        params: { id: created.id },
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not duplicate plan",
        description:
          error instanceof Error
            ? error.message
            : "The plan could not be copied.",
        variant: "error",
      });
    },
  });

  const archivePlan = useMutation({
    mutationFn: (plan: StudioSubscription) =>
      api.patch<StudioSubscription>(`/subscriptions/${plan.id}`, {
        active: false,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["subscriptions", studioId],
      });
      toast({
        title: "Plan archived",
        description: "Students can no longer subscribe to this plan.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not archive plan",
        description:
          error instanceof Error
            ? error.message
            : "The plan could not be archived.",
        variant: "error",
      });
    },
  });

  return (
    <Screen
      title="Subscriptions"
      subtitle="Studio-wide membership offers students can subscribe to."
      wide
      actions={
        <TouchButton
          as={Link}
          to="/app/subscriptions/new"
          variant="primary"
          size="md"
        >
          <Icon name="plus" />
          Add subscription
        </TouchButton>
      }
    >
      <PullToRefresh
        onRefresh={() =>
          Promise.all([query.refetch(), invoicesQuery.refetch()])
        }
      >
        <SubscriptionsWorkspace
          subscriptions={query.data ?? []}
          activity={activity}
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
          onEdit={(plan) => {
            void navigate({
              to: "/app/subscriptions/$id",
              params: { id: plan.id },
            });
          }}
          onDuplicate={(plan) => {
            if (plan.kind === "FAMILY") {
              toast({
                title: "Family plans cannot be duplicated",
                description:
                  "Household pricing is combined from invoices, not copied as a new plan.",
                variant: "error",
              });
              return;
            }
            duplicatePlan.mutate(plan);
          }}
          onArchive={(plan) => archivePlan.mutate(plan)}
          archivePending={archivePlan.isPending}
          subscribers={
            subscriberPlan
              ? subscribersFromInvoices(invoices, subscriberPlan.name)
              : null
          }
          subscribersTitle={
            subscriberPlan ? `${subscriberPlan.name} subscribers` : undefined
          }
          subscribersLoading={
            Boolean(subscriberPlan) && invoicesQuery.isLoading
          }
          onViewSubscribers={setSubscriberPlan}
          onCloseSubscribers={() => setSubscriberPlan(null)}
        />
      </PullToRefresh>
    </Screen>
  );
}

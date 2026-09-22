import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import {
  SubscriptionForm,
  type SubscriptionFormSubmit,
} from "@/modules/subscriptions/subscription-form";
import type { StudioSubscription } from "@/modules/subscriptions/subscription-types";
import { ApiState } from "@/modules/ui/api-state";
import { AppSheet } from "@/modules/ui/app-sheet";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

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
    queryFn: () => api.get<StudioSubscription>(`/subscriptions/${id}`),
  });

  return (
    <Screen
      title="Edit subscription"
      subtitle="Pricing, availability, and archive options."
      showBack
      backTo="/app/subscriptions"
      wide
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
  subscription: StudioSubscription;
}) {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("EditSubscriptionForm");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const membershipCount = subscription.membershipCount ?? 0;
  const batchPlanCount = subscription.batchPlanCount ?? 0;
  const canDelete =
    subscription.canDelete ?? (membershipCount === 0 && batchPlanCount === 0);

  const inUseHint =
    membershipCount > 0
      ? "This plan has memberships, so it can’t be deleted. Archive it instead."
      : batchPlanCount > 0
        ? "This plan is attached to batches. Remove it from those batches first, or archive it."
        : null;

  const updateSubscription = useMutation({
    mutationFn: (values: SubscriptionFormSubmit) =>
      api.patch<StudioSubscription>(`/subscriptions/${subscription.id}`, {
        name: values.name,
        billingCadence: values.billingCadence,
        price: values.price,
        active: values.active,
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

  const deleteSubscription = useMutation({
    mutationFn: () => api.delete(`/subscriptions/${subscription.id}`),
    onSuccess: async () => {
      setDeleteOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", studioId],
        }),
        queryClient.removeQueries({
          queryKey: ["subscription", subscription.id],
        }),
      ]);
      toast({
        title: "Plan deleted",
        description: "The unused membership plan was removed.",
        variant: "success",
      });
      await navigate({ to: "/app/subscriptions" });
    },
  });

  return (
    <>
      <SubscriptionForm
        mode="edit"
        subscription={subscription}
        isPending={updateSubscription.isPending}
        onSubmit={(values) => updateSubscription.mutate(values)}
        canDelete={canDelete}
        inUseHint={inUseHint}
        onDelete={() => setDeleteOpen(true)}
      />

      <AppSheet
        isOpen={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleteSubscription.isPending) {
            setDeleteOpen(false);
          }
        }}
        title="Delete plan"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Delete “{subscription.name}”? Only unused plans can be removed. This
            cannot be undone.
          </p>
          {deleteSubscription.isError ? (
            <ErrorState
              description={
                deleteSubscription.error instanceof Error
                  ? deleteSubscription.error.message
                  : "This plan could not be deleted."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteSubscription.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteSubscription.isPending}
              data-testid="confirm-delete-subscription"
              onClick={() => deleteSubscription.mutate()}
            >
              Delete plan
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </>
  );
}

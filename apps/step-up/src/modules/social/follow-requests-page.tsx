import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api-context";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./follow-requests-page.module.scss";
import type { FollowRequest } from "./types";

type FollowRequestsPageProps = {
  backTo?: string;
};

export function FollowRequestsPage({
  backTo = "/me/profile",
}: FollowRequestsPageProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ["follow-requests"],
    queryFn: () => api.get<FollowRequest[]>("/users/me/follow-requests"),
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.post(`/users/me/follow-requests/${requestId}/accept`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["follow-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) =>
      api.post(`/users/me/follow-requests/${requestId}/reject`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    },
  });

  const requests = requestsQuery.data;

  return (
    <Screen title="Follow requests" showBack backTo={backTo}>
      <div className={styles.root}>
        <p className={styles.description}>
          People waiting to follow your private profile.
        </p>

        {requestsQuery.isLoading ? (
          <div className={styles.list}>
            <SkeletonBlock height="4.5rem" radius="var(--radius-xl)" />
            <SkeletonBlock height="4.5rem" radius="var(--radius-xl)" />
          </div>
        ) : null}

        {requestsQuery.isError ? (
          <ErrorState
            description={
              requestsQuery.error instanceof Error
                ? requestsQuery.error.message
                : "Could not load requests."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => requestsQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {!requestsQuery.isLoading &&
        !requestsQuery.isError &&
        (!requests || requests.length === 0) ? (
          <EmptyState
            title="No requests"
            description="New follow requests will show up here."
          />
        ) : null}

        {requests && requests.length > 0 ? (
          <ul className={styles.list}>
            {requests.map((request) => (
              <li key={request.id} className={styles.requestRow}>
                <div className={styles.requestPerson}>
                  <Avatar size="sm">
                    {request.requester.photoUrl ? (
                      <AvatarImage
                        src={request.requester.photoUrl}
                        alt={request.requester.name}
                      />
                    ) : null}
                    <AvatarFallback>
                      {request.requester.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={styles.requestName}>
                    {request.requester.name}
                  </span>
                </div>
                <div className={styles.requestActions}>
                  <TouchButton
                    variant="primary"
                    size="sm"
                    type="button"
                    isPending={
                      acceptMutation.isPending &&
                      acceptMutation.variables === request.id
                    }
                    isDisabled={rejectMutation.isPending}
                    onClick={() => acceptMutation.mutate(request.id)}
                  >
                    Accept
                  </TouchButton>
                  <TouchButton
                    variant="quiet"
                    size="sm"
                    type="button"
                    isPending={
                      rejectMutation.isPending &&
                      rejectMutation.variables === request.id
                    }
                    isDisabled={acceptMutation.isPending}
                    onClick={() => rejectMutation.mutate(request.id)}
                  >
                    Decline
                  </TouchButton>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Screen>
  );
}

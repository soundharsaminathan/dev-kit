import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Card, CardContent } from "@dev-ui/components/card";
import { Empty, EmptyDescription } from "@dev-ui/components/empty";
import { Skeleton } from "@dev-ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { FormError } from "@/modules/ui/controls";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationRow[]>("/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed");
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Update failed");
    },
  });

  return (
    <div className="lm-page">
      <div className="lm-page-header">
        <div>
          <h1>Notifications</h1>
          <p>In-app inbox for your user.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          isDisabled={markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <Icon name="check" />
          Mark all read
        </Button>
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <Card>
        <CardContent>
        {notifications.isLoading ? <Skeleton /> : null}
        {notifications.isError ? (
          <FormError>{(notifications.error as Error).message}</FormError>
        ) : null}
        {notifications.data?.length === 0 ? (
          <Empty>
            <EmptyDescription>No notifications.</EmptyDescription>
          </Empty>
        ) : null}
        {notifications.data && notifications.data.length > 0 ? (
          <Table<NotificationRow> aria-label="Notifications" items={notifications.data}>
            <TableHeader>
              <TableColumn id="when" isRowHeader>
                When
              </TableColumn>
              <TableColumn id="title">Title</TableColumn>
              <TableColumn id="message">Message</TableColumn>
              <TableColumn id="action">Action</TableColumn>
            </TableHeader>
            <TableBody<NotificationRow>>
              {(note) => (
                <TableRow>
                  {(column) => (
                    <TableCell>
                      {column.id === "when"
                        ? new Date(note.createdAt).toLocaleString()
                        : null}
                      {column.id === "title" ? (
                        <>
                          {!note.readAt ? (
                            <Badge variant="info" appearance="subtle">
                              New
                            </Badge>
                          ) : null}{" "}
                          {note.title}
                        </>
                      ) : null}
                      {column.id === "message" ? note.body : null}
                      {column.id === "action" ? (
                        !note.readAt ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isDisabled={markRead.isPending}
                            onClick={() => markRead.mutate(note.id)}
                          >
                            Mark read
                          </Button>
                        ) : (
                          "Read"
                        )
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

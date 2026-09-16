import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

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
        <button
          type="button"
          className="lm-btn lm-btn-secondary"
          disabled={markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          Mark all read
        </button>
      </div>

      {error ? <p className="lm-error">{error}</p> : null}

      <div className="lm-card lm-table-wrap">
        {notifications.isLoading ? <p>Loading…</p> : null}
        {notifications.isError ? (
          <p className="lm-error">{(notifications.error as Error).message}</p>
        ) : null}
        {notifications.data?.length === 0 ? (
          <p className="lm-muted">No notifications.</p>
        ) : null}
        {notifications.data && notifications.data.length > 0 ? (
          <table className="lm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Title</th>
                <th>Message</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {notifications.data.map((n) => (
                <tr key={n.id}>
                  <td>{new Date(n.createdAt).toLocaleString()}</td>
                  <td>
                    {!n.readAt ? <span className="lm-badge">New</span> : null}{" "}
                    {n.title}
                  </td>
                  <td>{n.body}</td>
                  <td>
                    {!n.readAt ? (
                      <button
                        type="button"
                        className="lm-btn lm-btn-secondary"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(n.id)}
                      >
                        Mark read
                      </button>
                    ) : (
                      "Read"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

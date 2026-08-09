import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import styles from "@/modules/layout/app-header.module.scss";

type Preference = {
  type: string;
  channel: "IN_APP" | "PUSH" | "EMAIL";
  enabled: boolean;
  quietStartMinutes: number | null;
  quietEndMinutes: number | null;
};

const PREF_LABELS: Record<string, string> = {
  MISSED_SESSION: "Missed sessions",
  SESSION_ADDED: "New sessions",
  SESSION_CHANGED: "Session schedule changes",
  SESSION_CANCELLED: "Cancelled sessions",
  SUBSCRIPTION_EXPIRING: "Subscription expiring",
  PAYMENT_OVERDUE: "Payment overdue",
  PAYMENT_RECEIVED: "Payment received",
  RENEWED: "Subscription renewed",
  NOT_RENEWED: "Subscription not renewed",
  NEW_FOLLOW: "New followers",
  CHAT_MESSAGE: "Chat messages",
};

function preferencesKey(userId: string | undefined) {
  return ["notifications", userId, "preferences"] as const;
}

export function NotificationPreferencesPanel() {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = preferencesKey(user?.id);
  const scrollRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const query = useQuery({
    queryKey,
    queryFn: () => api.get<Preference[]>("/notifications/preferences"),
    enabled: Boolean(user),
  });

  const updateEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      setEdges({ top: false, bottom: false });
      return;
    }
    const top = node.scrollTop > 2;
    const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 2;
    setEdges((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);

  useEffect(() => {
    updateEdges();
  }, [query.data, updateEdges]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => updateEdges());
    observer.observe(node);
    return () => observer.disconnect();
  }, [updateEdges]);

  const toggle = useMutation({
    mutationFn: (preferences: Preference[]) =>
      api.put<Preference[]>("/notifications/preferences", { preferences }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Preference[]>(queryKey);
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const pushPrefs = (query.data ?? []).filter(
    (pref) => pref.channel === "PUSH" && pref.type !== "*",
  );

  if (query.isLoading) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyBody}>Loading preferences…</span>
      </div>
    );
  }

  return (
    <div
      className={styles.prefScroll}
      data-fade-top={edges.top ? "true" : undefined}
      data-fade-bottom={edges.bottom ? "true" : undefined}
    >
      <ul ref={scrollRef} className={styles.prefList} onScroll={updateEdges}>
        {pushPrefs.map((pref) => {
          const enabled = pref.enabled;
          return (
            <li key={`${pref.type}-${pref.channel}`}>
              <button
                type="button"
                className={styles.prefRow}
                data-enabled={enabled ? "true" : undefined}
                aria-pressed={enabled}
                onClick={() => {
                  const current =
                    queryClient.getQueryData<Preference[]>(queryKey) ??
                    query.data ??
                    [];
                  const next = current.map((row) =>
                    row.type === pref.type && row.channel === pref.channel
                      ? { ...row, enabled: !row.enabled }
                      : row,
                  );
                  toggle.mutate(next);
                }}
              >
                <span className={styles.prefCopy}>
                  <span className={styles.prefLabel}>
                    {PREF_LABELS[pref.type] ??
                      pref.type.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span className={styles.prefHint}>
                    {enabled ? "Push on" : "Push off"}
                  </span>
                </span>
                <span className={styles.prefSwitch} aria-hidden>
                  <span className={styles.prefThumb} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

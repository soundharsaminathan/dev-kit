import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import {
  type NotificationItem,
  NotificationsPanel,
} from "./notifications-panel";

const items: NotificationItem[] = [
  {
    id: "n1",
    type: "MISSED_SESSION",
    title: "Missed session",
    body: "You were marked absent",
    meta: { sessionId: "session-kids-mon", batchId: "batch-1" },
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    type: "RENEWED",
    title: "Plan renewed",
    body: "Membership renewed",
    readAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

function renderPanel(
  props: Partial<React.ComponentProps<typeof NotificationsPanel>> = {},
) {
  const onMarkRead = vi.fn();
  const onMarkAllRead = vi.fn();
  const onOpen = vi.fn();
  const onTogglePreferences = vi.fn();
  renderWithProviders(
    <NotificationsPanel
      items={items}
      loading={false}
      connected
      variant="me"
      unreadCount={1}
      showPreferences={false}
      onTogglePreferences={onTogglePreferences}
      onMarkRead={onMarkRead}
      onMarkAllRead={onMarkAllRead}
      onOpen={onOpen}
      {...props}
    />,
  );
  return { onMarkRead, onMarkAllRead, onOpen, onTogglePreferences };
}

describe("NotificationsPanel", () => {
  it("marks an unread item read and opens its destination", () => {
    const { onMarkRead, onOpen } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Missed session/i }));

    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/me/batches/$id",
        params: { id: "batch-1" },
      }),
    );
  });

  it("marks all as read when unread exist", () => {
    const { onMarkAllRead } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("hides mark-all when there are no unread", () => {
    renderPanel({ unreadCount: 0, items: [items[1]!] });
    expect(
      screen.queryByRole("button", { name: "Mark all as read" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("shows empty state", () => {
    renderPanel({ items: [], unreadCount: 0 });
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });
});

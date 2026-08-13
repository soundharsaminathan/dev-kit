import type { ChatEventInfo, ChatRsvpStatus } from "./types";

export function applyRsvpOptimistically(
  event: ChatEventInfo,
  status: ChatRsvpStatus,
  userId: string,
): ChatEventInfo {
  if ((event.rsvps[status] ?? []).includes(userId)) {
    return event;
  }

  const rsvps = {
    GOING: (event.rsvps.GOING ?? []).filter((id) => id !== userId),
    MAYBE: (event.rsvps.MAYBE ?? []).filter((id) => id !== userId),
    DECLINED: (event.rsvps.DECLINED ?? []).filter((id) => id !== userId),
  } satisfies Record<ChatRsvpStatus, string[]>;

  rsvps[status] = [...rsvps[status], userId];
  return { ...event, rsvps };
}

import type { ChatEventInfo, ChatRsvpStatus } from "./types";

type PendingRsvp = {
  status: ChatRsvpStatus;
  userId: string;
  generation: number;
};

let rsvpGeneration = 0;
const pendingRsvps = new Map<string, PendingRsvp>();

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

export function setPendingRsvp(
  eventId: string,
  status: ChatRsvpStatus,
  userId: string,
) {
  rsvpGeneration += 1;
  pendingRsvps.set(eventId, {
    status,
    userId,
    generation: rsvpGeneration,
  });
  return rsvpGeneration;
}

export function getPendingRsvp(eventId: string) {
  return pendingRsvps.get(eventId);
}

export function isCurrentPendingRsvp(eventId: string, generation: number) {
  return pendingRsvps.get(eventId)?.generation === generation;
}

export function clearPendingRsvp(eventId: string, generation: number) {
  if (pendingRsvps.get(eventId)?.generation !== generation) {
    return;
  }
  pendingRsvps.delete(eventId);
}

export function mergeEventWithPendingRsvp(
  event: ChatEventInfo,
  userId: string,
) {
  const pending = pendingRsvps.get(event.id);
  if (!pending || pending.userId !== userId) {
    return event;
  }
  return applyRsvpOptimistically(event, pending.status, userId);
}

export function resetPendingRsvpsForTests() {
  rsvpGeneration = 0;
  pendingRsvps.clear();
}

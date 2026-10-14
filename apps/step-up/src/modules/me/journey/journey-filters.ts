import type { JourneyEvent, JourneyFilterTag } from "./journey-types";

export const JOURNEY_FILTER_CHIPS: Array<{
  id: "all" | JourneyFilterTag;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "attendance", label: "Attendance" },
  { id: "batches", label: "Batches" },
  { id: "competitions", label: "Competitions" },
  { id: "certificates", label: "Certificates" },
  { id: "plans", label: "Plans" },
  { id: "achievements", label: "Achievements" },
  { id: "feedback", label: "Feedback" },
];

export function filterJourneyEvents(
  events: JourneyEvent[],
  filter: "all" | JourneyFilterTag,
): JourneyEvent[] {
  if (filter === "all") return events;
  return events.filter((event) => event.filterTags.includes(filter));
}

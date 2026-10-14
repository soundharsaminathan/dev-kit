import { describe, expect, it } from "vitest";
import type { JourneyEvent } from "./journey-types";
import {
  buildJourneyGraph,
  CLUSTER_MIN_COUNT,
  clusterAttendanceEvents,
} from "./layout-path";

function attendance(index: number, dayOffset: number): JourneyEvent {
  const date = new Date("2026-03-01T10:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return {
    id: `a-${index}`,
    kind: "ATTENDANCE",
    tier: "small",
    title: "Class",
    occurredAt: date.toISOString(),
    status: "completed",
    icon: "check-circle",
    filterTags: ["attendance"],
  };
}

describe("layout-path", () => {
  it("clusters dense attendance when zoomed out", () => {
    const events = Array.from({ length: CLUSTER_MIN_COUNT + 2 }, (_, i) =>
      attendance(i, i),
    );
    const clustered = clusterAttendanceEvents(events, { zoom: 0.5 });
    expect(clustered).toHaveLength(1);
    expect(clustered[0]?.kind).toBe("CLUSTER");
    if (clustered[0]?.kind === "CLUSTER") {
      expect(clustered[0].count).toBe(CLUSTER_MIN_COUNT + 2);
    }
  });

  it("does not cluster when zoomed in", () => {
    const events = Array.from({ length: CLUSTER_MIN_COUNT + 2 }, (_, i) =>
      attendance(i, i),
    );
    const clustered = clusterAttendanceEvents(events, { zoom: 1 });
    expect(clustered).toHaveLength(events.length);
  });

  it("expands a forced cluster id", () => {
    const events = Array.from({ length: CLUSTER_MIN_COUNT }, (_, i) =>
      attendance(i, i),
    );
    const clustered = clusterAttendanceEvents(events, { zoom: 0.4 });
    const clusterId = clustered[0]!.id;
    const expanded = clusterAttendanceEvents(events, {
      zoom: 0.4,
      forceExpandIds: new Set([clusterId]),
    });
    expect(expanded).toHaveLength(CLUSTER_MIN_COUNT);
  });

  it("builds serpentine nodes and edges", () => {
    const events: JourneyEvent[] = [
      {
        id: "joined",
        kind: "JOINED",
        tier: "large",
        title: "Joined",
        occurredAt: "2026-01-01T00:00:00.000Z",
        status: "completed",
        icon: "sparkles",
        filterTags: ["batches"],
      },
      {
        id: "batch",
        kind: "BATCH",
        tier: "medium",
        title: "Batch A",
        occurredAt: "2026-01-05T00:00:00.000Z",
        status: "current",
        icon: "users",
        filterTags: ["batches"],
      },
    ];
    const graph = buildJourneyGraph(events, { zoom: 1 });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes[0]?.type).toBe("milestone");
    expect(graph.nodes[1]?.type).toBe("event");
    expect(graph.nodes[0]?.position.y).toBe(0);
    expect(graph.nodes[1]?.position.y).toBeGreaterThan(0);
    expect(graph.nodes[0]?.width).toBe(112);
    expect(graph.nodes[0]?.height).toBe(112);
    expect(graph.nodes[1]?.width).toBe(72);
    expect(graph.nodes[1]?.height).toBe(72);
  });
});

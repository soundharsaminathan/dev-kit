import {
  type Edge,
  MiniMap,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedMetric } from "@/modules/ui/animated-metric";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import { Celebration } from "./celebration";
import { journeyEdgeTypes } from "./edges/journey-edge";
import { filterJourneyEvents, JOURNEY_FILTER_CHIPS } from "./journey-filters";
import styles from "./journey-page.module.scss";
import type {
  JourneyFilterTag,
  JourneyPathItem,
  JourneyPayload,
} from "./journey-types";
import { buildJourneyGraph, type JourneyNodeData } from "./layout-path";
import {
  createJourneyNodeTypes,
  type JourneyNodeActions,
} from "./nodes/journey-nodes";
import {
  EventDetailSheet,
  QuickActionsSheet,
} from "./sheets/event-detail-sheet";

function viewportKey(studentId: string) {
  return `step-up:journey-viewport:${studentId}`;
}

function readViewport(studentId: string): Viewport | null {
  try {
    const raw = localStorage.getItem(viewportKey(studentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Viewport;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.zoom === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y) &&
      Number.isFinite(parsed.zoom) &&
      parsed.zoom > 0
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeViewport(studentId: string, viewport: Viewport) {
  try {
    localStorage.setItem(viewportKey(studentId), JSON.stringify(viewport));
  } catch {
    /* ignore quota */
  }
}

type JourneyCanvasInnerProps = {
  payload: JourneyPayload;
  studentId: string;
};

function JourneyCanvasInner({ payload, studentId }: JourneyCanvasInnerProps) {
  const navigate = useNavigate();
  const { setCenter, getZoom, setViewport, fitView } = useReactFlow();
  const [filter, setFilter] = useState<"all" | JourneyFilterTag>("all");
  const [zoom, setZoom] = useState(1);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    () => new Set(),
  );
  const [detailItem, setDetailItem] = useState<JourneyPathItem | null>(null);
  const [actionsItem, setActionsItem] = useState<JourneyPathItem | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const lastTapRef = useRef(0);
  const itemsByIdRef = useRef<Map<string, JourneyPathItem>>(new Map());
  const actionsRef = useRef<JourneyNodeActions>({
    onOpen: () => {},
    onLongPress: () => {},
  });
  const viewportInitializedFor = useRef<string | null>(null);

  const filtered = useMemo(
    () => filterJourneyEvents(payload.events, filter),
    [payload.events, filter],
  );

  const graph = useMemo(
    () =>
      buildJourneyGraph(filtered, {
        zoom,
        forceExpandIds: expandedClusters,
      }),
    [filtered, zoom, expandedClusters],
  );

  useEffect(() => {
    itemsByIdRef.current = new Map(graph.items.map((item) => [item.id, item]));
  }, [graph.items]);

  const openItem = useCallback((id: string) => {
    const item = itemsByIdRef.current.get(id) ?? null;
    setDetailItem(item);
  }, []);

  const longPressItem = useCallback((id: string) => {
    const item = itemsByIdRef.current.get(id) ?? null;
    setActionsItem(item);
  }, []);

  const expandCluster = useCallback((id: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  actionsRef.current = {
    onOpen: openItem,
    onLongPress: longPressItem,
    onExpandCluster: expandCluster,
  };

  const nodeTypes = useMemo(
    () =>
      createJourneyNodeTypes({
        onOpen: (id) => actionsRef.current.onOpen(id),
        onLongPress: (id) => actionsRef.current.onLongPress(id),
        onExpandCluster: (id) => actionsRef.current.onExpandCluster?.(id),
      }),
    [],
  );

  const applyInitialViewport = useCallback(() => {
    if (viewportInitializedFor.current === studentId) return;
    viewportInitializedFor.current = studentId;

    const saved = readViewport(studentId);
    if (saved) {
      void setViewport(saved);
      setZoom(saved.zoom);
      return;
    }

    if (payload.currentEventId) {
      const node = graph.nodes.find((n) => n.id === payload.currentEventId);
      if (node) {
        const size = (node.data as JourneyNodeData).size;
        void setCenter(node.position.x + size / 2, node.position.y + size / 2, {
          zoom: 1,
          duration: 0,
        });
        return;
      }
    }

    void fitView({ padding: 0.3, duration: 0 });
  }, [
    fitView,
    graph.nodes,
    payload.currentEventId,
    setCenter,
    setViewport,
    studentId,
  ]);

  useEffect(() => {
    viewportInitializedFor.current = null;
  }, [studentId]);

  useEffect(() => {
    if (graph.nodes.length === 0) return;
    const frame = requestAnimationFrame(() => {
      applyInitialViewport();
    });
    return () => cancelAnimationFrame(frame);
  }, [applyInitialViewport, graph.nodes.length, studentId]);

  useEffect(() => {
    const hasNew = payload.events.some((event) => event.newlyEarned);
    if (hasNew) setCelebrate(true);
  }, [payload.events]);

  const centerCurrent = useCallback(() => {
    if (!payload.currentEventId) return;
    const node = graph.nodes.find((n) => n.id === payload.currentEventId);
    if (!node) return;
    const size = (node.data as JourneyNodeData).size;
    void setCenter(node.position.x + size / 2, node.position.y + size / 2, {
      zoom: Math.max(getZoom(), 1),
      duration: 400,
    });
  }, [graph.nodes, getZoom, payload.currentEventId, setCenter]);

  const onPaneClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      centerCurrent();
    }
    lastTapRef.current = now;
  }, [centerCurrent]);

  const stats = payload.stats;
  const savedViewport = readViewport(studentId);

  return (
    <>
      <div className={styles.canvasWrap} data-testid="journey-canvas">
        <ReactFlow
          className={styles.flow}
          nodes={graph.nodes as Node[]}
          edges={graph.edges as Edge[]}
          nodeTypes={nodeTypes}
          edgeTypes={journeyEdgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnPinch
          zoomOnScroll={false}
          panOnScroll={false}
          zoomOnDoubleClick={false}
          minZoom={0.35}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          onPaneClick={onPaneClick}
          onInit={() => {
            requestAnimationFrame(() => {
              applyInitialViewport();
            });
          }}
          onMoveEnd={(_event, viewport) => {
            setZoom(viewport.zoom);
            writeViewport(studentId, viewport);
          }}
          onMove={(_event, viewport) => {
            setZoom(viewport.zoom);
          }}
          defaultViewport={savedViewport ?? { x: 0, y: 40, zoom: 1 }}
          fitView={!savedViewport}
          fitViewOptions={{ padding: 0.3 }}
        >
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              const item = (node.data as JourneyNodeData | undefined)?.item;
              if (!item) return "var(--muted)";
              if (item.status === "current") return "var(--accent)";
              if (item.status === "upcoming")
                return "color-mix(in oklab, var(--muted-fg) 40%, transparent)";
              return "color-mix(in oklab, var(--accent) 55%, transparent)";
            }}
          />
          <Panel position="top-left" className={styles.topOverlays}>
            <div className={styles.glassBar}>
              <div className={styles.headerRow}>
                <div>
                  <h1 className={styles.title}>Learning journey</h1>
                  <p className={styles.subtitle}>
                    {payload.student.name}
                    {payload.student.level ? ` · ${payload.student.level}` : ""}
                  </p>
                </div>
              </div>
              <FilterChipRow
                chips={JOURNEY_FILTER_CHIPS}
                selected={[filter]}
                onToggle={(id) => {
                  setFilter(id as "all" | JourneyFilterTag);
                }}
              />
            </div>
            <div className={styles.glassBar}>
              <div className={styles.statsGrid}>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.yearsLearning} />
                  </span>
                  <span className={styles.statLabel}>Years</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.classesAttended} />
                  </span>
                  <span className={styles.statLabel}>Classes</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.attendancePercent} />%
                  </span>
                  <span className={styles.statLabel}>Attendance</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.currentStreak} />
                  </span>
                  <span className={styles.statLabel}>Streak</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.certificates} />
                  </span>
                  <span className={styles.statLabel}>Certs</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.competitions} />
                  </span>
                  <span className={styles.statLabel}>Comps</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    <AnimatedMetric value={stats.longestStreak} />
                  </span>
                  <span className={styles.statLabel}>Best streak</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statValue}>
                    {stats.currentLevel ?? "—"}
                  </span>
                  <span className={styles.statLabel}>Level</span>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
        <Celebration active={celebrate} />
        <p className={styles.centerHint}>Double-tap to center</p>
      </div>

      <EventDetailSheet
        item={detailItem}
        isOpen={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      />
      <QuickActionsSheet
        item={actionsItem}
        isOpen={Boolean(actionsItem)}
        onOpenChange={(open) => {
          if (!open) setActionsItem(null);
        }}
        onShare={
          actionsItem && navigator.share
            ? () => {
                void navigator.share({
                  title: actionsItem.title,
                  text: `My dance journey: ${actionsItem.title}`,
                });
              }
            : undefined
        }
        onViewBatch={(batchId) => {
          void navigate({
            to: "/me/batches/$id",
            params: { id: batchId },
          });
        }}
      />
    </>
  );
}

export function JourneyCanvas(props: JourneyCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <JourneyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

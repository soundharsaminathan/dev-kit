import { DateRangePicker } from "@dev-ui/components/date-picker";
import { SearchField } from "@dev-ui/components/search-field";
import { useToastContext } from "@dev-ui/components/toast";
import { useIsMobile, useLoadMoreOnScroll } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { LeadCard } from "@/modules/leads/lead-card";
import { LeadCardSkeletonList } from "@/modules/leads/lead-card-skeleton";
import { LeadDetailSheet } from "@/modules/leads/lead-detail-sheet";
import { LeadPipelineTabs } from "@/modules/leads/lead-pipeline-tabs";
import styles from "@/modules/leads/leads.module.scss";
import { QuickAddLeadSheet } from "@/modules/leads/quick-add-lead-sheet";
import { SwitchTrialSheet } from "@/modules/leads/switch-trial-sheet";
import {
  isDateKey,
  LEAD_PAGE_SIZE,
  type Lead,
  type LeadDateRange,
  type LeadPage,
  type LeadSection,
  leadDateRangeFromValue,
  leadDateRangeToValue,
  matchingPreset,
  presetRange,
  QUICK_DATE_LABELS,
  quickDatePresetsForSection,
  rangeLabel,
  SECTION_LABELS,
  SECTION_ORDER,
  sectionAppliesDateFilter,
} from "@/modules/leads/types";
import { LoadMoreIndicator } from "@/modules/ui/load-more-indicator";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type LeadsSearch = {
  from?: string;
  to?: string;
  section?: LeadSection;
  filter?: "all";
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const SWIPE_DRAG = 56;
const SWIPE_VELOCITY = 450;

type SwipeDirection = -1 | 1;

const SWIPE_SPRING = {
  type: "spring",
  stiffness: 400,
  damping: 40,
  mass: 0.9,
} as const;

const pageVariants: Variants = {
  enter: (direction: SwipeDirection) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (direction: SwipeDirection) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
};

function isLeadSection(value: unknown): value is LeadSection {
  return (
    typeof value === "string" &&
    (SECTION_ORDER as readonly string[]).includes(value)
  );
}

function parseSearch(search: Record<string, unknown>): LeadsSearch {
  const result: LeadsSearch = {};
  if (
    typeof search.from === "string" &&
    typeof search.to === "string" &&
    isDateKey(search.from) &&
    isDateKey(search.to) &&
    search.from <= search.to
  ) {
    result.from = search.from;
    result.to = search.to;
  }
  if (isLeadSection(search.section)) {
    result.section = search.section;
  }
  if (search.filter === "all") {
    result.filter = "all";
  }
  return result;
}

function sectionAtOffset(
  current: LeadSection,
  direction: -1 | 1,
): LeadSection | null {
  const index = SECTION_ORDER.indexOf(current);
  const next = index + direction;
  if (next < 0 || next >= SECTION_ORDER.length) return null;
  return SECTION_ORDER[next] ?? null;
}

function sectionFromSwipe(
  current: LeadSection,
  offsetX: number,
  offsetY: number,
  velocityX = 0,
): LeadSection | null {
  const horizontal =
    Math.abs(offsetX) >= Math.abs(offsetY) ||
    Math.abs(velocityX) >= SWIPE_VELOCITY;
  if (!horizontal) return null;
  let direction: -1 | 1 | null = null;
  if (offsetX < -SWIPE_DRAG || velocityX < -SWIPE_VELOCITY) {
    direction = 1;
  } else if (offsetX > SWIPE_DRAG || velocityX > SWIPE_VELOCITY) {
    direction = -1;
  }
  if (!direction) return null;
  return sectionAtOffset(current, direction);
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

type LeadPages = InfiniteData<LeadPage, string | undefined>;

type LeadsCacheSnapshot = Array<[QueryKey, LeadPages | undefined]>;

function snapshotLeadsCache(
  queryClient: QueryClient,
  studioId: string,
): LeadsCacheSnapshot {
  return queryClient.getQueriesData<LeadPages>({
    queryKey: ["studio-leads", studioId],
  });
}

function removeLeadsFromCache(
  queryClient: QueryClient,
  studioId: string,
  ids: ReadonlySet<string>,
) {
  queryClient.setQueriesData<LeadPages>(
    { queryKey: ["studio-leads", studioId] },
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => {
        const items = page.items.filter((item) => !ids.has(item.id));
        return items.length === page.items.length ? page : { ...page, items };
      });
      const changed = pages.some(
        (page, index) => page !== current.pages[index],
      );
      return changed ? { ...current, pages } : current;
    },
  );
}

function restoreLeadsCache(
  queryClient: QueryClient,
  snapshot: LeadsCacheSnapshot,
) {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

export const Route = createFileRoute("/app/leads/")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  validateSearch: (search: Record<string, unknown>): LeadsSearch =>
    parseSearch(search),
  component: LeadsPage,
});

function LeadsPage() {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("LeadsPage");
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const activeSection = searchParams.section ?? "new";
  const range = useMemo<LeadDateRange | null>(() => {
    if (searchParams.from && searchParams.to) {
      return { from: searchParams.from, to: searchParams.to };
    }
    if (searchParams.filter === "all") return null;
    return sectionAppliesDateFilter(activeSection)
      ? presetRange("today")
      : null;
  }, [searchParams, activeSection]);
  const activePreset = matchingPreset(range);
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
  const [direction, setDirection] = useState<SwipeDirection>(1);
  const [addOpen, setAddOpen] = useState(false);
  const [switchLead, setSwitchLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  useEffect(() => {
    if (isMobile) setSelectedIds(new Set());
  }, [isMobile]);

  const toggleSelect = useCallback((lead: Lead) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lead.id)) {
        next.delete(lead.id);
      } else {
        next.add(lead.id);
      }
      return next;
    });
  }, []);

  const query = useInfiniteQuery({
    queryKey: ["studio-leads", studioId, activeSection, range, debouncedSearch],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("section", activeSection);
      if (range && sectionAppliesDateFilter(activeSection)) {
        params.set("from", range.from);
        params.set("to", range.to);
      }
      params.set("limit", String(LEAD_PAGE_SIZE));
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (pageParam) params.set("cursor", pageParam);
      return api.get<LeadPage>(
        `/users/studio/${studioId}/leads?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const leads = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const confirmSession = useMutation({
    mutationFn: (bookingId: string) =>
      api.patch(`/bookings/${bookingId}/status`, { status: "CONFIRMED" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["bookings", "studio", studioId],
      });
      toast({
        title: "Session confirmed",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t confirm session",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const archiveLead = useMutation({
    mutationFn: (lead: Lead) =>
      api.patch(`/users/studio/${studioId}/students/${lead.id}`, {
        active: false,
      }),
    onMutate: async (lead) => {
      await queryClient.cancelQueries({
        queryKey: ["studio-leads", studioId],
      });
      const snapshot = snapshotLeadsCache(queryClient, studioId);
      removeLeadsFromCache(queryClient, studioId, new Set([lead.id]));
      return snapshot;
    },
    onError: (error: unknown, _lead, snapshot) => {
      if (snapshot) restoreLeadsCache(queryClient, snapshot);
      toast({
        title: "Couldn’t archive lead",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
    onSuccess: (_data, lead) => {
      setSelectedIds((prev) => {
        if (!prev.has(lead.id)) return prev;
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
      toast({
        title: `${lead.name} archived`,
        description: "They won't show up in new leads anymore.",
        variant: "success",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
  });

  const archiveLeads = useMutation({
    mutationFn: (leads: Lead[]) =>
      Promise.all(
        leads.map((lead) =>
          api.patch(`/users/studio/${studioId}/students/${lead.id}`, {
            active: false,
          }),
        ),
      ),
    onMutate: async (leads) => {
      await queryClient.cancelQueries({
        queryKey: ["studio-leads", studioId],
      });
      const snapshot = snapshotLeadsCache(queryClient, studioId);
      removeLeadsFromCache(
        queryClient,
        studioId,
        new Set(leads.map((lead) => lead.id)),
      );
      return snapshot;
    },
    onError: (error: unknown, _leads, snapshot) => {
      if (snapshot) restoreLeadsCache(queryClient, snapshot);
      toast({
        title: "Couldn’t archive leads",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
    onSuccess: (_data, leads) => {
      const ids = new Set(leads.map((lead) => lead.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      toast({
        title: `${leads.length} lead${leads.length === 1 ? "" : "s"} archived`,
        description: "They won't show up in new leads anymore.",
        variant: "success",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
  });

  const unarchiveLead = useMutation({
    mutationFn: (lead: Lead) =>
      api.patch(`/users/studio/${studioId}/students/${lead.id}`, {
        active: true,
      }),
    onMutate: async (lead) => {
      await queryClient.cancelQueries({
        queryKey: ["studio-leads", studioId],
      });
      const snapshot = snapshotLeadsCache(queryClient, studioId);
      removeLeadsFromCache(queryClient, studioId, new Set([lead.id]));
      return snapshot;
    },
    onError: (error: unknown, _lead, snapshot) => {
      if (snapshot) restoreLeadsCache(queryClient, snapshot);
      toast({
        title: "Couldn’t unarchive lead",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
    onSuccess: (_data, lead) => {
      setSelectedIds((prev) => {
        if (!prev.has(lead.id)) return prev;
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
      toast({
        title: `${lead.name} unarchived`,
        description: "They're back in your leads.",
        variant: "success",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
  });

  const unarchiveLeads = useMutation({
    mutationFn: (leads: Lead[]) =>
      Promise.all(
        leads.map((lead) =>
          api.patch(`/users/studio/${studioId}/students/${lead.id}`, {
            active: true,
          }),
        ),
      ),
    onMutate: async (leads) => {
      await queryClient.cancelQueries({
        queryKey: ["studio-leads", studioId],
      });
      const snapshot = snapshotLeadsCache(queryClient, studioId);
      removeLeadsFromCache(
        queryClient,
        studioId,
        new Set(leads.map((lead) => lead.id)),
      );
      return snapshot;
    },
    onError: (error: unknown, _leads, snapshot) => {
      if (snapshot) restoreLeadsCache(queryClient, snapshot);
      toast({
        title: "Couldn’t unarchive leads",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
    onSuccess: (_data, leads) => {
      const ids = new Set(leads.map((lead) => lead.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      toast({
        title: `${leads.length} lead${leads.length === 1 ? "" : "s"} unarchived`,
        description: "They're back in your leads.",
        variant: "success",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
    },
  });

  const selectedLeads = useMemo(
    () => leads.filter((lead) => selectedIds.has(lead.id)),
    [leads, selectedIds],
  );
  const allSelectedArchived =
    selectedLeads.length > 0 &&
    selectedLeads.every((lead) => lead.section === "archived");

  const hasSearch = Boolean(search.trim());
  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);
  const loadMoreRef = useLoadMoreOnScroll({
    hasMore: Boolean(hasNextPage),
    isLoading: isFetchingNextPage,
    onLoadMore: loadMore,
  });

  const subtitle = useMemo(() => {
    if (query.isLoading) return undefined;
    const count = leads.length;
    const more = hasNextPage ? "+" : "";
    if (hasSearch) {
      return `${count}${more} matching lead${count === 1 ? "" : "s"}`;
    }
    if (range && sectionAppliesDateFilter(activeSection)) {
      const item = activeSection === "converted" ? "converted" : "trial";
      const suffix = item === "trial" && count !== 1 ? "s" : "";
      return `${count}${more} ${item}${suffix} · ${rangeLabel(range)}`;
    }
    return `${count}${more} ${SECTION_LABELS[activeSection].toLowerCase()}`;
  }, [
    query.isLoading,
    range,
    hasNextPage,
    hasSearch,
    leads.length,
    activeSection,
  ]);

  function setRange(next: LeadDateRange | null) {
    void navigate({
      search: {
        ...(next ? { from: next.from, to: next.to } : { filter: "all" }),
        section: activeSection,
      },
    });
  }

  function selectSection(section: LeadSection) {
    if (section === activeSection) return;
    const fromIndex = SECTION_ORDER.indexOf(activeSection);
    const toIndex = SECTION_ORDER.indexOf(section);
    setDirection(toIndex > fromIndex ? 1 : -1);
    const keepRange = sectionAppliesDateFilter(section);
    void navigate({
      search: {
        ...(keepRange && range ? { from: range.from, to: range.to } : {}),
        section,
      },
    });
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const next = sectionFromSwipe(
      activeSection,
      info.offset.x,
      info.offset.y,
      info.velocity.x,
    );
    if (next) selectSection(next);
  }

  const canSwipe = isMobile && !reduce;

  const itemTransition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: EASE_OUT };
  const exitTransition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 520, damping: 38, mass: 1 };

  const pageTransition = reduce ? { duration: 0 } : { x: SWIPE_SPRING };
  const dragReturnTransition = reduce ? { duration: 0 } : SWIPE_SPRING;

  return (
    <>
      <Screen
        title="Trial caller"
        subtitle={
          query.isLoading ? (
            <span
              className={styles.subtitleSkeleton}
              data-testid="leads-subtitle-skeleton"
              aria-hidden="true"
            />
          ) : (
            subtitle
          )
        }
        actions={
          <TouchButton
            size="sm"
            variant="primary"
            aria-label="Add lead"
            data-testid="add-lead"
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" />
            Add
          </TouchButton>
        }
        className={styles.leadsScreen ?? ""}
      >
        <PullToRefresh
          onRefresh={() => refetch()}
          className={styles.fill ?? ""}
        >
          <div className={`${staff.section} ${styles.fill ?? ""}`}>
            <LeadPipelineTabs
              activeSection={activeSection}
              onSelectSection={selectSection}
            />

            <div className={styles.searchBar} data-testid="leads-search">
              <SearchField
                aria-label="Search leads"
                placeholder="Search leads"
                value={search}
                onChange={setSearch}
              />
            </div>

            {sectionAppliesDateFilter(activeSection) ? (
              <div className={styles.rangeBar}>
                <DateRangePicker
                  aria-label="Lead date range"
                  value={leadDateRangeToValue(range)}
                  onChange={(value) => setRange(leadDateRangeFromValue(value))}
                  className={styles.rangePicker}
                />
                <div
                  className={styles.quickActions}
                  role="toolbar"
                  aria-label="Filter leads"
                >
                  <button
                    type="button"
                    className={styles.filterChip}
                    data-selected={!range ? "true" : undefined}
                    data-testid="leads-filter-all"
                    onClick={() => setRange(null)}
                  >
                    All
                  </button>
                  {quickDatePresetsForSection(activeSection).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={styles.filterChip}
                      data-selected={
                        activePreset === preset ? "true" : undefined
                      }
                      data-testid={`leads-filter-${preset}`}
                      onClick={() => setRange(presetRange(preset))}
                    >
                      {QUICK_DATE_LABELS[preset]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!isMobile && selectedIds.size > 0 ? (
              <div
                className={styles.selectionBar}
                data-testid="leads-selection-bar"
              >
                <span className={styles.selectionCount}>
                  {selectedIds.size} selected
                </span>
                {allSelectedArchived ? (
                  <TouchButton
                    variant="primary"
                    size="sm"
                    isPending={unarchiveLeads.isPending}
                    isDisabled={unarchiveLeads.isPending}
                    data-testid="leads-unarchive-selected"
                    onClick={() => {
                      if (selectedLeads.length === 0) return;
                      unarchiveLeads.mutate(selectedLeads);
                    }}
                  >
                    <Icon name="inbox" />
                    Unarchive
                  </TouchButton>
                ) : (
                  <TouchButton
                    variant="danger"
                    size="sm"
                    isPending={archiveLeads.isPending}
                    isDisabled={archiveLeads.isPending}
                    data-testid="leads-archive-selected"
                    onClick={() => {
                      if (selectedLeads.length === 0) return;
                      archiveLeads.mutate(selectedLeads);
                    }}
                  >
                    <Icon name="archive" />
                    Archive
                  </TouchButton>
                )}
                <TouchButton
                  variant="quiet"
                  size="sm"
                  data-testid="leads-clear-selection"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancel
                </TouchButton>
              </div>
            ) : null}

            <motion.div
              className={styles.swipeArea}
              drag={canSwipe ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.55}
              dragDirectionLock
              animate={{ x: 0 }}
              transition={dragReturnTransition}
              {...(canSwipe ? { onDragEnd: handleDragEnd } : {})}
            >
              <AnimatePresence
                initial={false}
                mode="popLayout"
                custom={direction}
              >
                <motion.div
                  key={activeSection}
                  className={`${styles.swipePage} ${staff.scrollPad}`}
                  data-scroll-pad
                  custom={direction}
                  variants={pageVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={pageTransition}
                >
                  {query.isLoading ? (
                    <LeadCardSkeletonList count={4} label="Loading leads" />
                  ) : null}

                  {query.isError ? (
                    <ErrorState
                      description={
                        query.error instanceof Error
                          ? query.error.message
                          : "Could not load leads."
                      }
                      action={
                        <TouchButton
                          variant="primary"
                          onClick={() => query.refetch()}
                        >
                          Try again
                        </TouchButton>
                      }
                    />
                  ) : null}

                  {query.isSuccess && leads.length === 0 ? (
                    <EmptyState
                      icon="smartphone"
                      title={
                        hasSearch
                          ? "No matching leads"
                          : `No ${SECTION_LABELS[activeSection].toLowerCase()}`
                      }
                      description={
                        hasSearch
                          ? "Try another name or clear your search."
                          : "Nothing here yet. Try a different filter."
                      }
                      action={
                        !hasSearch ? (
                          <TouchButton
                            variant="primary"
                            onClick={() => setAddOpen(true)}
                          >
                            Add lead
                          </TouchButton>
                        ) : undefined
                      }
                    />
                  ) : null}

                  <ul className={staff.list}>
                    <AnimatePresence initial={false} mode="popLayout">
                      {leads.map((lead) => {
                        const canSelect = !isMobile;
                        const canSwitchTrial =
                          lead.section === "new" ||
                          lead.section === "trialBooked" ||
                          lead.section === "trialMissed";
                        return (
                          <motion.li
                            key={lead.id}
                            layout
                            className={styles.li}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{
                              opacity: 0,
                              x: lead.section === "archived" ? "100%" : "-100%",
                              transition: exitTransition,
                            }}
                            transition={itemTransition}
                          >
                            <LeadCard
                              lead={lead}
                              range={range}
                              selected={
                                canSelect ? selectedIds.has(lead.id) : false
                              }
                              onToggleSelect={
                                canSelect ? toggleSelect : undefined
                              }
                              onOpen={setDetailLead}
                              onSwitchTrial={
                                canSwitchTrial ? setSwitchLead : undefined
                              }
                              {...(lead.section === "trialBooked"
                                ? {
                                    onConfirmSession: (next) => {
                                      const bookingId = next.trialBooking?.id;
                                      if (!bookingId) return;
                                      confirmSession.mutate(bookingId);
                                    },
                                    confirmPending:
                                      confirmSession.isPending &&
                                      confirmSession.variables ===
                                        lead.trialBooking?.id,
                                  }
                                : {})}
                            />
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>

                  {hasNextPage ? (
                    <LoadMoreIndicator
                      ref={loadMoreRef}
                      isLoading={isFetchingNextPage}
                      testId="leads-load-more"
                    />
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </PullToRefresh>
      </Screen>

      <QuickAddLeadSheet
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        studioId={studioId}
      />
      <LeadDetailSheet
        key={detailLead?.id ?? "lead-detail"}
        lead={
          detailLead
            ? (leads.find((item) => item.id === detailLead.id) ?? detailLead)
            : null
        }
        studioId={studioId}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null);
        }}
        onArchive={(lead) => {
          setDetailLead(null);
          archiveLead.mutate(lead);
        }}
        onUnarchive={(lead) => {
          setDetailLead(null);
          unarchiveLead.mutate(lead);
        }}
        archivePending={
          (archiveLead.isPending &&
            archiveLead.variables?.id === detailLead?.id) ||
          (unarchiveLead.isPending &&
            unarchiveLead.variables?.id === detailLead?.id)
        }
      />
      <SwitchTrialSheet
        lead={switchLead}
        studioId={studioId}
        defaultDate={range?.from ?? null}
        onOpenChange={(open) => {
          if (!open) setSwitchLead(null);
        }}
      />
    </>
  );
}

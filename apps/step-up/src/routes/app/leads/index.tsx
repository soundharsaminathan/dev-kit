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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { LeadCard } from "@/modules/leads/lead-card";
import { LeadDetailSheet } from "@/modules/leads/lead-detail-sheet";
import styles from "@/modules/leads/leads.module.scss";
import { QuickAddLeadSheet } from "@/modules/leads/quick-add-lead-sheet";
import { SwitchTrialSheet } from "@/modules/leads/switch-trial-sheet";
import {
  emptyLeadsDescription,
  emptyLeadsTitle,
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
  QUICK_DATE_PRESETS,
  rangeLabel,
  SECTION_LABELS,
} from "@/modules/leads/types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type LeadsSearch = {
  from?: string;
  to?: string;
  section?: LeadSection;
};

const SECTION_ORDER: LeadSection[] = ["new", "trialBooked", "archived"];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

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
  if (
    search.section === "new" ||
    search.section === "trialBooked" ||
    search.section === "archived"
  ) {
    result.section = search.section;
  }
  return result;
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
  const range = useMemo<LeadDateRange | null>(
    () =>
      searchParams.from && searchParams.to
        ? { from: searchParams.from, to: searchParams.to }
        : null,
    [searchParams],
  );
  const activePreset = matchingPreset(range);
  const activeSection = searchParams.section ?? null;
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
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
    queryKey: ["studio-leads", studioId, range, debouncedSearch],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (range) {
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

  const grouped = useMemo(() => {
    const map: Record<LeadSection, Lead[]> = {
      new: [],
      trialBooked: [],
      archived: [],
    };
    for (const lead of leads) {
      map[lead.section].push(lead);
    }
    return map;
  }, [leads]);

  const visibleSections = useMemo(() => {
    const sections = activeSection ? [activeSection] : SECTION_ORDER;
    return sections.filter((section) => grouped[section].length > 0);
  }, [grouped, activeSection]);

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
    const count = leads.length;
    const more = hasNextPage ? "+" : "";
    if (hasSearch) {
      return `${count}${more} matching lead${count === 1 ? "" : "s"}`;
    }
    if (activeSection) {
      const sectionCount = grouped[activeSection].length;
      return `${sectionCount}${more} ${SECTION_LABELS[activeSection].toLowerCase()}`;
    }
    if (range) {
      return `${count}${more} trial${count === 1 ? "" : "s"} · ${rangeLabel(range)}`;
    }
    return "Call new signups and confirm trial sessions.";
  }, [range, hasNextPage, hasSearch, leads.length, activeSection, grouped]);

  function setRange(next: LeadDateRange | null) {
    void navigate({
      search: {
        ...(next ? { from: next.from, to: next.to } : {}),
        ...(activeSection ? { section: activeSection } : {}),
      },
    });
  }

  function setFilters(next: {
    range: LeadDateRange | null;
    section: LeadSection | null;
  }) {
    void navigate({
      search: {
        ...(next.range ? { from: next.range.from, to: next.range.to } : {}),
        ...(next.section ? { section: next.section } : {}),
      },
    });
  }

  const itemTransition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: EASE_OUT };
  const exitTransition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 520, damping: 38, mass: 1 };

  return (
    <>
      <Screen
        title="Trial caller"
        subtitle={subtitle}
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
      >
        <PullToRefresh onRefresh={() => refetch()}>
          <div className={staff.section}>
            <div className={styles.searchBar} data-testid="leads-search">
              <SearchField
                aria-label="Search leads"
                placeholder="Search leads"
                value={search}
                onChange={setSearch}
              />
            </div>

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
                  data-selected={!range && !activeSection ? "true" : undefined}
                  data-testid="leads-filter-all"
                  onClick={() => setFilters({ range: null, section: null })}
                >
                  All
                </button>
                {QUICK_DATE_PRESETS.filter((preset) => preset !== "last7").map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={styles.filterChip}
                      data-selected={
                        activePreset === preset ? "true" : undefined
                      }
                      data-testid={`leads-filter-${preset}`}
                      onClick={() =>
                        setFilters({
                          range: presetRange(preset),
                          section: null,
                        })
                      }
                    >
                      {QUICK_DATE_LABELS[preset]}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className={styles.filterChip}
                  data-selected={
                    activeSection === "archived" ? "true" : undefined
                  }
                  data-testid="leads-section-archived"
                  onClick={() =>
                    setFilters({ range: null, section: "archived" })
                  }
                >
                  Archived
                </button>
              </div>
            </div>

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

            {query.isLoading ? (
              <SkeletonRowList count={4} label="Loading leads" />
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

            {query.isSuccess && visibleSections.length === 0 ? (
              <EmptyState
                icon="smartphone"
                title={
                  activeSection
                    ? `No ${SECTION_LABELS[activeSection].toLowerCase()}`
                    : emptyLeadsTitle(range, hasSearch)
                }
                description={
                  activeSection
                    ? "Nothing here yet. Try a different filter."
                    : emptyLeadsDescription(range, hasSearch)
                }
                action={
                  !activeSection && !range && !hasSearch ? (
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

            {SECTION_ORDER.map((section) => {
              if (activeSection && section !== activeSection) return null;
              const leadsInSection = grouped[section];
              const sectionCount = leadsInSection.length;
              return (
                <section key={section} className={staff.section}>
                  {sectionCount > 0 ? (
                    <h2 className={staff.sectionTitle}>
                      {SECTION_LABELS[section]} · {sectionCount}
                      {hasNextPage ? "+" : ""}
                    </h2>
                  ) : null}
                  <ul className={staff.list}>
                    <AnimatePresence initial={false} mode="popLayout">
                      {leadsInSection.map((lead) => {
                        const canSelect = !isMobile;
                        return (
                          <motion.li
                            key={lead.id}
                            layout
                            className={styles.li}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{
                              opacity: 0,
                              x: section === "archived" ? "100%" : "-100%",
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
                              onSwitchTrial={setSwitchLead}
                              {...(section === "trialBooked"
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
                </section>
              );
            })}

            {hasNextPage ? (
              <div
                ref={loadMoreRef}
                className={styles.loadMore}
                data-testid="leads-load-more"
              >
                {isFetchingNextPage ? (
                  <SkeletonRowList count={2} label="Loading more leads" />
                ) : null}
              </div>
            ) : null}
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

import { DateRangePicker } from "@dev-ui/components/date-picker";
import { SearchField } from "@dev-ui/components/search-field";
import { Swipeable } from "@dev-ui/components/swipeable";
import { useToastContext } from "@dev-ui/components/toast";
import { useIsMobile, useLoadMoreOnScroll } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import {
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

const SECTION_CHIP_LABELS: Record<LeadSection, string> = {
  new: "New",
  trialBooked: "Trial booked",
  archived: "Archived",
};

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
    onSuccess: async (_data, lead) => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
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
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t archive lead",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
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
    onSuccess: async (_data, leads) => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
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
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t archive leads",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
      });
    },
  });

  const unarchiveLead = useMutation({
    mutationFn: (lead: Lead) =>
      api.patch(`/users/studio/${studioId}/students/${lead.id}`, {
        active: true,
      }),
    onSuccess: async (_data, lead) => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
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
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t unarchive lead",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
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
    onSuccess: async (_data, leads) => {
      await queryClient.invalidateQueries({
        queryKey: ["studio-leads", studioId],
      });
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
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t unarchive leads",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "error",
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

  function setSection(next: LeadSection | null) {
    void navigate({
      search: {
        ...(next === "archived"
          ? {}
          : range
            ? { from: range.from, to: range.to }
            : {}),
        ...(next ? { section: next } : {}),
      },
    });
  }

  const itemTransition = reduce
    ? { duration: 0 }
    : { duration: 0.3, ease: EASE_OUT };

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
                aria-label="Quick date ranges"
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
                {QUICK_DATE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={styles.filterChip}
                    data-selected={activePreset === preset ? "true" : undefined}
                    data-testid={`leads-filter-${preset}`}
                    onClick={() => setRange(presetRange(preset))}
                  >
                    {QUICK_DATE_LABELS[preset]}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={styles.quickActions}
              role="toolbar"
              aria-label="Filter leads by status"
            >
              <button
                type="button"
                className={styles.filterChip}
                data-selected={!activeSection ? "true" : undefined}
                data-testid="leads-section-all"
                onClick={() => setSection(null)}
              >
                All
              </button>
              {SECTION_ORDER.map((section) => (
                <button
                  key={section}
                  type="button"
                  className={styles.filterChip}
                  data-selected={activeSection === section ? "true" : undefined}
                  data-testid={`leads-section-${section}`}
                  onClick={() => setSection(section)}
                >
                  {SECTION_CHIP_LABELS[section]}
                </button>
              ))}
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

            {visibleSections.map((section) => (
              <section key={section} className={staff.section}>
                <h2 className={staff.sectionTitle}>
                  {SECTION_LABELS[section]} · {grouped[section].length}
                  {hasNextPage ? "+" : ""}
                </h2>
                <ul className={staff.list}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {grouped[section].map((lead) => {
                      const canSelect = !isMobile;
                      const card = (
                        <LeadCard
                          lead={lead}
                          range={range}
                          selected={
                            canSelect ? selectedIds.has(lead.id) : false
                          }
                          onToggleSelect={canSelect ? toggleSelect : undefined}
                          onViewProfile={() => {
                            void navigate({
                              to: "/users/$id",
                              params: { id: lead.id },
                            });
                          }}
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
                      );

                      const item =
                        section === "archived" ? (
                          <Swipeable
                            direction="horizontal"
                            ariaLabel={`Actions for ${lead.name}`}
                            onSwipeRight={() => unarchiveLead.mutate(lead)}
                            leftActions={
                              <TouchButton
                                variant="primary"
                                size="sm"
                                isIconOnly
                                className={styles.archiveAction}
                                aria-label={`Unarchive ${lead.name}`}
                                data-testid={`lead-unarchive-${lead.id}`}
                                isDisabled={
                                  unarchiveLead.isPending &&
                                  unarchiveLead.variables?.id === lead.id
                                }
                                onClick={() => unarchiveLead.mutate(lead)}
                              >
                                <Icon name="inbox" />
                              </TouchButton>
                            }
                          >
                            {card}
                          </Swipeable>
                        ) : (
                          <Swipeable
                            direction="horizontal"
                            ariaLabel={`Actions for ${lead.name}`}
                            onSwipeLeft={() => archiveLead.mutate(lead)}
                            rightActions={
                              <TouchButton
                                variant="danger"
                                size="sm"
                                isIconOnly
                                className={styles.archiveAction}
                                aria-label={`Archive ${lead.name}`}
                                data-testid={`lead-archive-${lead.id}`}
                                isDisabled={
                                  archiveLead.isPending &&
                                  archiveLead.variables?.id === lead.id
                                }
                                onClick={() => archiveLead.mutate(lead)}
                              >
                                <Icon name="archive" />
                              </TouchButton>
                            }
                          >
                            {card}
                          </Swipeable>
                        );

                      return (
                        <motion.li
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -140 }}
                          transition={itemTransition}
                        >
                          {item}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            ))}

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

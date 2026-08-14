import { DateRangePicker } from "@dev-ui/components/date-picker";
import { SearchField } from "@dev-ui/components/search-field";
import { useToastContext } from "@dev-ui/components/toast";
import { useLoadMoreOnScroll } from "@dev-ui/hooks";
import { Icon } from "@dev-ui/icons";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
};

const SECTION_ORDER: LeadSection[] = ["new", "trialBooked", "archived"];

function parseSearch(search: Record<string, unknown>): LeadsSearch {
  if (
    typeof search.from === "string" &&
    typeof search.to === "string" &&
    isDateKey(search.from) &&
    isDateKey(search.to) &&
    search.from <= search.to
  ) {
    return { from: search.from, to: search.to };
  }
  return {};
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
  const [addOpen, setAddOpen] = useState(false);
  const [switchLead, setSwitchLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

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
    return SECTION_ORDER.filter((section) => grouped[section].length > 0);
  }, [grouped]);

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
    if (range) {
      return `${count}${more} trial${count === 1 ? "" : "s"} · ${rangeLabel(range)}`;
    }
    return "Call new signups and confirm trial sessions.";
  }, [range, hasNextPage, hasSearch, leads.length]);

  function setRange(next: LeadDateRange | null) {
    void navigate({
      search: next ? { from: next.from, to: next.to } : {},
    });
  }

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

            {query.isSuccess && leads.length === 0 ? (
              <EmptyState
                icon="smartphone"
                title={emptyLeadsTitle(range, hasSearch)}
                description={emptyLeadsDescription(range, hasSearch)}
                action={
                  !range && !hasSearch ? (
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
                  {grouped[section].map((lead) => (
                    <li key={lead.id}>
                      <LeadCard
                        lead={lead}
                        range={range}
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
                    </li>
                  ))}
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

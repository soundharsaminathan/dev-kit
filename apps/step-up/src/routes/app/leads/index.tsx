import { Icon } from "@dev-ui/icons";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { LeadCard } from "@/modules/leads/lead-card";
import styles from "@/modules/leads/leads.module.scss";
import { QuickAddLeadSheet } from "@/modules/leads/quick-add-lead-sheet";
import { SwitchTrialSheet } from "@/modules/leads/switch-trial-sheet";
import {
  FILTER_LABELS,
  LEAD_DATE_FILTERS,
  type Lead,
  type LeadDateFilter,
  type LeadSection,
  SECTION_LABELS,
} from "@/modules/leads/types";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonRowList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type LeadsSearch = {
  filter?: LeadDateFilter;
};

const SECTION_ORDER: LeadSection[] = ["new", "trialBooked", "archived"];

function parseSearch(search: Record<string, unknown>): LeadsSearch {
  if (
    typeof search.filter === "string" &&
    (LEAD_DATE_FILTERS as readonly string[]).includes(search.filter)
  ) {
    return { filter: search.filter as LeadDateFilter };
  }
  return {};
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
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const filter = searchParams.filter ?? "all";
  const [addOpen, setAddOpen] = useState(false);
  const [switchLead, setSwitchLead] = useState<Lead | null>(null);

  const query = useQuery({
    queryKey: ["studio-leads", studioId, filter],
    queryFn: () =>
      api.get<Lead[]>(
        `/users/studio/${studioId}/leads?filter=${encodeURIComponent(filter)}`,
      ),
  });

  const grouped = useMemo(() => {
    const leads = query.data ?? [];
    const map: Record<LeadSection, Lead[]> = {
      new: [],
      trialBooked: [],
      archived: [],
    };
    for (const lead of leads) {
      map[lead.section].push(lead);
    }
    return map;
  }, [query.data]);

  const visibleSections = useMemo(() => {
    return SECTION_ORDER.filter((section) => grouped[section].length > 0);
  }, [grouped]);

  const subtitle = useMemo(() => {
    const count = query.data?.length ?? 0;
    if (filter === "today") {
      return `${count} trial${count === 1 ? "" : "s"} to call today`;
    }
    if (filter === "tomorrow") {
      return `${count} trial${count === 1 ? "" : "s"} to call tomorrow`;
    }
    return "Call new signups and confirm trial sessions.";
  }, [filter, query.data?.length]);

  function setFilter(next: LeadDateFilter) {
    void navigate({
      search: next === "all" ? {} : { filter: next },
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
        <PullToRefresh onRefresh={() => query.refetch()}>
          <div className={staff.section}>
            <div
              className={styles.filters}
              role="toolbar"
              aria-label="Lead filters"
            >
              {LEAD_DATE_FILTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.filterChip}
                  data-selected={filter === value ? "true" : undefined}
                  data-testid={`leads-filter-${value}`}
                  onClick={() => setFilter(value)}
                >
                  {FILTER_LABELS[value]}
                </button>
              ))}
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

            {query.data && query.data.length === 0 ? (
              <EmptyState
                icon="smartphone"
                title={
                  filter === "all"
                    ? "No leads yet"
                    : `No trials ${filter === "today" ? "today" : "tomorrow"}`
                }
                description={
                  filter === "all"
                    ? "Add a lead quickly when someone calls in."
                    : "Pick All to see every follow-up."
                }
                action={
                  filter === "all" ? (
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
                </h2>
                <ul className={staff.list}>
                  {grouped[section].map((lead) => (
                    <li key={lead.id}>
                      <LeadCard
                        lead={lead}
                        filter={filter}
                        {...(section === "trialBooked"
                          ? { onSwitchTrial: setSwitchLead }
                          : {})}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
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
        onOpenChange={(open) => {
          if (!open) setSwitchLead(null);
        }}
      />
    </>
  );
}

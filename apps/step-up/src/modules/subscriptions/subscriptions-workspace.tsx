import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import { SearchField } from "@dev-ui/components/search-field";
import { Icon, type IconName } from "@dev-ui/icons";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatPrice } from "@/modules/payments/invoice-types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  CADENCE_TABS,
  durationLabel,
  filterSubscriptions,
  formatActivityWhen,
  formatPlanPrice,
  isInUse,
  memberSeatLabel,
  metaLine,
  planCategory,
  planIcon,
  SUBSCRIPTION_FACETS,
  SUBSCRIPTION_SORTS,
  statusLabel,
  summarizeSubscriptions,
} from "./subscription-model";
import type {
  CadenceFilter,
  StudioSubscription,
  SubscriptionActivity,
  SubscriptionFacet,
  SubscriptionQuery,
  SubscriptionSort,
  SubscriptionSubscriber,
} from "./subscription-types";
import styles from "./subscriptions-workspace.module.scss";

export type SubscriptionsWorkspaceProps = {
  subscriptions: StudioSubscription[];
  activity: SubscriptionActivity[];
  isLoading?: boolean | undefined;
  isError?: boolean | undefined;
  error?: unknown;
  onRetry?: (() => void) | undefined;
  onEdit: (plan: StudioSubscription) => void;
  onDuplicate: (plan: StudioSubscription) => void;
  onArchive: (plan: StudioSubscription) => void;
  archivePending?: boolean | undefined;
  subscribers: SubscriptionSubscriber[] | null;
  subscribersTitle?: string | undefined;
  subscribersLoading?: boolean | undefined;
  onViewSubscribers: (plan: StudioSubscription) => void;
  onCloseSubscribers: () => void;
};

function toggleFacet(facets: SubscriptionFacet[], id: SubscriptionFacet) {
  return facets.includes(id)
    ? facets.filter((facet) => facet !== id)
    : [...facets, id];
}

function activityIcon(verb: SubscriptionActivity["verb"]): IconName {
  if (verb === "Cancelled") return "x-circle";
  if (verb === "Activated") return "check-circle";
  if (verb === "Invoiced") return "file-text";
  return "refresh";
}

function Metrics({
  summary,
}: {
  summary: ReturnType<typeof summarizeSubscriptions>;
}) {
  return (
    <section className={styles.metrics} aria-label="Subscription summary">
      <article className={styles.metric}>
        <strong className={styles.metricValue}>{summary.totalPlans}</strong>
        <span className={styles.metricLabel}>Total plans</span>
      </article>
      <article className={styles.metric}>
        <strong className={styles.metricValue}>{summary.active}</strong>
        <span className={styles.metricLabel}>Active</span>
      </article>
      <article className={styles.metric}>
        <strong className={styles.metricValue}>{summary.unused}</strong>
        <span className={styles.metricLabel}>Unused</span>
      </article>
      <article className={styles.metric}>
        <strong className={styles.metricValue}>{summary.subscribers}</strong>
        <span className={styles.metricLabel}>Subscribers</span>
      </article>
    </section>
  );
}

function OverviewBody({
  summary,
  activity,
}: {
  summary: ReturnType<typeof summarizeSubscriptions>;
  activity: SubscriptionActivity[];
}) {
  return (
    <>
      <div className={styles.railMetrics}>
        <div className={styles.railMetric}>
          <strong>{summary.totalPlans}</strong>
          <span>Total plans</span>
        </div>
        <div className={styles.railMetric}>
          <strong>{summary.active}</strong>
          <span>Active</span>
        </div>
        <div className={styles.railMetric}>
          <strong>{summary.unused}</strong>
          <span>Unused</span>
        </div>
      </div>

      <div>
        <h3 className={styles.sectionTitle}>Recent activity</h3>
        {activity.length === 0 ? (
          <p className={styles.panelHint}>No membership activity yet.</p>
        ) : (
          <ol className={styles.activity}>
            {activity.map((item) => (
              <li key={item.id} className={styles.activityItem}>
                <span className={styles.activityIcon} aria-hidden>
                  <Icon name={activityIcon(item.verb)} />
                </span>
                <div className={styles.activityCopy}>
                  <p className={styles.activityTitle}>
                    {item.planName} — {item.verb}
                  </p>
                  <p className={styles.activityMeta}>
                    by {item.actor}
                    {item.at ? ` · ${formatActivityWhen(item.at)}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h3 className={styles.sectionTitle}>Quick actions</h3>
        <div className={styles.quickList}>
          <Link to="/app/invoices" className={styles.quickLink}>
            View all invoices
            <Icon name="arrow-right" />
          </Link>
          <Link to="/app/payments" className={styles.quickLink}>
            Manage payment methods
            <Icon name="arrow-right" />
          </Link>
        </div>
      </div>

      <div className={styles.promo}>
        <h3 className={styles.promoTitle}>Need a new plan?</h3>
        <p className={styles.promoCopy}>
          Create custom subscription plans for your studio.
        </p>
        <Link to="/app/subscriptions/new" className={styles.promoCta}>
          Create plan
          <Icon name="arrow-right" />
        </Link>
      </div>
    </>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDuplicate,
  onArchive,
  onViewSubscribers,
}: {
  plan: StudioSubscription;
  onEdit: (plan: StudioSubscription) => void;
  onDuplicate: (plan: StudioSubscription) => void;
  onArchive: (plan: StudioSubscription) => void;
  onViewSubscribers: (plan: StudioSubscription) => void;
}) {
  const used = isInUse(plan);
  const category = planCategory(plan);

  return (
    <article className={styles.card} data-category={category}>
      <span className={styles.planIcon} aria-hidden>
        <Icon name={planIcon(plan)} />
      </span>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <Link
            to="/app/subscriptions/$id"
            params={{ id: plan.id }}
            className={styles.cardLink}
          >
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planMeta}>{metaLine(plan)}</p>
          </Link>
          <div className={styles.priceBlock}>
            <span className={styles.price}>
              {formatPlanPrice(plan.price, plan.billingCadence)}
            </span>
            <span
              className={styles.status}
              data-tone={plan.active ? "success" : undefined}
            >
              <span className={styles.statusDot} aria-hidden />
              {statusLabel(plan)}
            </span>
          </div>
        </div>
        <ul className={styles.facts}>
          <li className={styles.fact}>
            <Icon name="clock" aria-hidden />
            <span>{durationLabel(plan.billingCadence)}</span>
          </li>
          <li className={styles.fact}>
            <Icon name="refresh" aria-hidden />
            <span>Auto renew</span>
          </li>
          <li className={styles.fact}>
            <Icon name="users" aria-hidden />
            <span>{memberSeatLabel(plan)}</span>
          </li>
        </ul>
      </div>
      <div className={styles.cardMenu}>
        <Menu>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={`Actions for ${plan.name}`}
          >
            <Icon name="more-vertical" />
          </button>
          <MenuContent
            placement="bottom end"
            aria-label={`Actions for ${plan.name}`}
            onAction={(key) => {
              if (key === "edit") onEdit(plan);
              if (key === "duplicate") onDuplicate(plan);
              if (key === "subscribers") onViewSubscribers(plan);
              if (key === "archive") onArchive(plan);
            }}
          >
            <MenuItem id="edit" textValue="Edit">
              <MenuItemLabel>Edit</MenuItemLabel>
            </MenuItem>
            <MenuItem id="duplicate" textValue="Duplicate">
              <MenuItemLabel>Duplicate</MenuItemLabel>
            </MenuItem>
            <MenuItem id="subscribers" textValue="View subscribers">
              <MenuItemLabel>View subscribers</MenuItemLabel>
            </MenuItem>
            <MenuItem
              id="archive"
              textValue="Archive"
              variant={used ? "danger" : "default"}
            >
              <MenuItemLabel>Archive</MenuItemLabel>
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </article>
  );
}

export function SubscriptionsWorkspace({
  subscriptions,
  activity,
  isLoading,
  isError,
  error,
  onRetry,
  onEdit,
  onDuplicate,
  onArchive,
  archivePending,
  subscribers,
  subscribersTitle,
  subscribersLoading,
  onViewSubscribers,
  onCloseSubscribers,
}: SubscriptionsWorkspaceProps) {
  const [query, setQuery] = useState<SubscriptionQuery>({
    cadence: "ALL",
    facets: [],
    search: "",
    sort: "name",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [archivePlan, setArchivePlan] = useState<StudioSubscription | null>(
    null,
  );

  const summary = useMemo(
    () => summarizeSubscriptions(subscriptions),
    [subscriptions],
  );
  const visible = useMemo(
    () => filterSubscriptions(subscriptions, query),
    [subscriptions, query],
  );

  const hasFilters =
    query.cadence !== "ALL" ||
    query.facets.length > 0 ||
    Boolean(query.search.trim()) ||
    query.sort !== "name";

  function setCadence(cadence: CadenceFilter) {
    setQuery((current) => ({ ...current, cadence }));
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.main}>
        <Metrics summary={summary} />

        <div className={styles.toolbar}>
          <div className={styles.cadenceRow}>
            <div
              className={styles.cadenceTabs}
              role="tablist"
              aria-label="Billing period"
            >
              {CADENCE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={query.cadence === tab.id}
                  className={styles.cadenceTab}
                  data-selected={query.cadence === tab.id ? "true" : undefined}
                  onClick={() => setCadence(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.tools}>
            <SearchField
              aria-label="Search subscriptions"
              placeholder="Search subscriptions"
              value={query.search}
              onChange={(search) =>
                setQuery((current) => ({ ...current, search }))
              }
              className={styles.search}
            />
            <button
              type="button"
              className={styles.iconBtn}
              data-active={query.facets.length > 0 ? "true" : undefined}
              aria-label="Filter subscriptions"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <Icon name="filter" />
              {query.facets.length > 0 ? (
                <span className={styles.iconDot} aria-hidden />
              ) : null}
            </button>
            <Menu>
              <button
                type="button"
                className={styles.iconBtn}
                data-active={query.sort !== "name" ? "true" : undefined}
                aria-label="Sort subscriptions"
              >
                <Icon name="chevrons-up-down" />
              </button>
              <MenuContent
                placement="bottom end"
                aria-label="Sort subscriptions"
                selectedKeys={[query.sort]}
                selectionMode="single"
                onAction={(key) =>
                  setQuery((current) => ({
                    ...current,
                    sort: String(key) as SubscriptionSort,
                  }))
                }
              >
                {SUBSCRIPTION_SORTS.map((item) => (
                  <MenuItem key={item.id} id={item.id} textValue={item.label}>
                    <MenuItemLabel>{item.label}</MenuItemLabel>
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          </div>
        </div>

        {isLoading ? <SkeletonCardList count={4} /> : null}

        {isError ? (
          <ErrorState
            description={
              error instanceof Error
                ? error.message
                : "Could not load subscriptions."
            }
            action={
              onRetry ? (
                <TouchButton variant="primary" onClick={onRetry}>
                  Try again
                </TouchButton>
              ) : null
            }
          />
        ) : null}

        {!isLoading && !isError && subscriptions.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <Icon name="wallet" />
            </span>
            <h2 className={styles.emptyTitle}>No subscription plans yet</h2>
            <p className={styles.emptyCopy}>
              Create your first membership plan so students can subscribe to
              your studio.
            </p>
            <TouchButton
              as={Link}
              to="/app/subscriptions/new"
              variant="primary"
            >
              <Icon name="plus" />
              Create subscription
            </TouchButton>
          </div>
        ) : null}

        {!isLoading &&
        !isError &&
        subscriptions.length > 0 &&
        visible.length === 0 ? (
          <EmptyState
            icon="search"
            title="No plans match these filters"
            description={
              hasFilters
                ? "Try another period, filter, or search."
                : "No subscriptions found."
            }
            action={
              <TouchButton
                variant="default"
                onClick={() =>
                  setQuery({
                    cadence: "ALL",
                    facets: [],
                    search: "",
                    sort: "name",
                  })
                }
              >
                Clear filters
              </TouchButton>
            }
          />
        ) : null}

        {visible.length > 0 ? (
          <ul className={styles.list}>
            {visible.map((plan) => (
              <li key={plan.id}>
                <PlanCard
                  plan={plan}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onArchive={(item) => setArchivePlan(item)}
                  onViewSubscribers={onViewSubscribers}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.mobileOverview}>
          <section className={styles.panel} aria-label="Subscription overview">
            <header>
              <h2 className={styles.panelTitle}>Subscription overview</h2>
              <p className={styles.panelHint}>
                Your studio membership plans at a glance.
              </p>
            </header>
            <OverviewBody summary={summary} activity={activity} />
          </section>
        </div>
      </div>

      <aside className={styles.rail} aria-label="Subscription overview">
        <section className={styles.panel}>
          <header>
            <h2 className={styles.panelTitle}>Subscription overview</h2>
            <p className={styles.panelHint}>
              Your studio membership plans at a glance.
            </p>
          </header>
          <OverviewBody summary={summary} activity={activity} />
        </section>
      </aside>

      <AppSheet
        isOpen={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter plans"
      >
        <div className={styles.sheetStack}>
          <div className={styles.facetGrid}>
            {SUBSCRIPTION_FACETS.map((facet) => (
              <button
                key={facet.id}
                type="button"
                className={styles.facet}
                data-selected={
                  query.facets.includes(facet.id) ? "true" : undefined
                }
                aria-pressed={query.facets.includes(facet.id)}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    facets: toggleFacet(current.facets, facet.id),
                  }))
                }
              >
                {facet.label}
              </button>
            ))}
          </div>
          <div className={styles.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              onClick={() =>
                setQuery((current) => ({ ...current, facets: [] }))
              }
            >
              Clear
            </TouchButton>
            <TouchButton
              variant="primary"
              fullWidth
              onClick={() => setFiltersOpen(false)}
            >
              Show {visible.length} plan{visible.length === 1 ? "" : "s"}
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={archivePlan !== null}
        onOpenChange={(open) => {
          if (!open && !archivePending) setArchivePlan(null);
        }}
        title="Archive plan"
      >
        {archivePlan ? (
          <div className={styles.sheetStack}>
            <p className={styles.sheetHint}>
              Archive “{archivePlan.name}”? Students will no longer be able to
              subscribe to this plan.
            </p>
            {isInUse(archivePlan) ? (
              <p className={styles.warning}>
                {(archivePlan.membershipCount ?? 0) > 0
                  ? `${archivePlan.membershipCount} member${archivePlan.membershipCount === 1 ? "" : "s"} ${archivePlan.membershipCount === 1 ? "is" : "are"} on this plan. Existing memberships stay active until they expire.`
                  : "This plan is attached to batches. Deactivate it instead of deleting it."}
              </p>
            ) : null}
            <div className={styles.sheetActions}>
              <TouchButton
                variant="default"
                fullWidth
                isDisabled={archivePending}
                onClick={() => setArchivePlan(null)}
              >
                Cancel
              </TouchButton>
              <TouchButton
                variant="danger"
                fullWidth
                isPending={archivePending}
                onClick={() => {
                  onArchive(archivePlan);
                  setArchivePlan(null);
                }}
              >
                Archive plan
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppSheet>

      <AppSheet
        isOpen={subscribers !== null}
        onOpenChange={(open) => {
          if (!open) onCloseSubscribers();
        }}
        title={subscribersTitle ?? "Subscribers"}
      >
        <div className={styles.sheetStack}>
          {subscribersLoading ? (
            <p className={styles.sheetHint}>Loading subscribers…</p>
          ) : null}
          {!subscribersLoading && subscribers && subscribers.length === 0 ? (
            <p className={styles.sheetHint}>
              No billed members found for this plan yet.
            </p>
          ) : null}
          {subscribers?.map((row) => (
            <div key={row.id} className={styles.subscriber}>
              <div>
                <div className={styles.subscriberName}>{row.name}</div>
                <div className={styles.subscriberMeta}>{row.status}</div>
              </div>
              {row.amount > 0 ? (
                <span className={styles.subscriberMeta}>
                  {formatPrice(row.amount)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </AppSheet>
    </div>
  );
}

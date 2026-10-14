import { formatPrice } from "@/modules/payments/invoice-types";
import type {
  BillingCadence,
  CadenceFilter,
  FamilyPack,
  StudioSubscription,
  SubscriptionActivity,
  SubscriptionFacet,
  SubscriptionKind,
  SubscriptionQuery,
  SubscriptionSort,
  SubscriptionSubscriber,
  SubscriptionSummary,
} from "./subscription-types";

const FAMILY_PACK_LABELS: Record<FamilyPack, string> = {
  TWO_KIDS: "2 kids",
  ONE_ADULT_ONE_KID: "1 adult + 1 kid",
  TWO_ADULTS: "2 adults",
  ONE_ADULT_TWO_KIDS: "1 adult + 2 kids",
  TWO_ADULTS_ONE_KID: "2 adults + 1 kid",
  TWO_ADULTS_TWO_KIDS: "2 adults + 2 kids",
};

export const CADENCE_TABS: Array<{ id: CadenceFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "YEARLY", label: "Yearly" },
];

export const SUBSCRIPTION_FACETS: Array<{
  id: SubscriptionFacet;
  label: string;
}> = [
  { id: "active", label: "Active" },
  { id: "unused", label: "Unused" },
  { id: "adult", label: "Adult" },
  { id: "kid", label: "Kid" },
  { id: "individual", label: "Individual" },
  { id: "family", label: "Family" },
];

export const SUBSCRIPTION_SORTS: Array<{
  id: SubscriptionSort;
  label: string;
}> = [
  { id: "name", label: "Name" },
  { id: "price-desc", label: "Price high to low" },
  { id: "price-asc", label: "Price low to high" },
  { id: "duration", label: "Duration" },
  { id: "in-use", label: "In use first" },
];

export function kindLabel(kind: SubscriptionKind) {
  return kind === "FAMILY" ? "Family" : "Individual";
}

export function audienceOrPackLabel(sub: {
  kind: SubscriptionKind;
  individualAudience?: StudioSubscription["individualAudience"];
  familyPack?: StudioSubscription["familyPack"];
}) {
  if (sub.kind === "INDIVIDUAL") {
    return sub.individualAudience === "KID" ? "Kid" : "Adult";
  }
  if (sub.familyPack && FAMILY_PACK_LABELS[sub.familyPack]) {
    return FAMILY_PACK_LABELS[sub.familyPack];
  }
  return "Family";
}

export function cadenceLabel(cadence: BillingCadence) {
  if (cadence === "QUARTERLY") return "Quarterly";
  if (cadence === "YEARLY") return "Yearly";
  return "Monthly";
}

export function cadenceSuffix(cadence: BillingCadence) {
  if (cadence === "QUARTERLY") return "/qtr";
  if (cadence === "YEARLY") return "/yr";
  return "/mo";
}

export function cadenceMonths(cadence: BillingCadence) {
  if (cadence === "QUARTERLY") return 3;
  if (cadence === "YEARLY") return 12;
  return 1;
}

export function durationLabel(cadence: BillingCadence) {
  const months = cadenceMonths(cadence);
  return months === 1 ? "1 month" : `${months} months`;
}

export function formatPlanPrice(
  amount: number | string,
  cadence: BillingCadence,
) {
  return `${formatPrice(amount)} ${cadenceSuffix(cadence)}`;
}

export function memberSeatCount(
  sub: Pick<StudioSubscription, "adultSeats" | "kidSeats">,
) {
  return Math.max(0, (sub.adultSeats ?? 0) + (sub.kidSeats ?? 0));
}

export function memberSeatLabel(
  sub: Pick<StudioSubscription, "adultSeats" | "kidSeats">,
) {
  const count = memberSeatCount(sub);
  return count === 1 ? "1 member" : `${count} members`;
}

export function isUnused(
  sub: Pick<
    StudioSubscription,
    "canDelete" | "membershipCount" | "batchPlanCount"
  >,
) {
  if (sub.canDelete !== undefined) return sub.canDelete;
  return (sub.membershipCount ?? 0) === 0 && (sub.batchPlanCount ?? 0) === 0;
}

export function isInUse(
  sub: Pick<
    StudioSubscription,
    "canDelete" | "membershipCount" | "batchPlanCount"
  >,
) {
  return !isUnused(sub);
}

export function usageLabel(
  sub: Pick<
    StudioSubscription,
    "canDelete" | "membershipCount" | "batchPlanCount"
  >,
) {
  return isUnused(sub) ? "Unused" : "In use";
}

export function statusLabel(sub: Pick<StudioSubscription, "active">) {
  return sub.active ? "Active" : "Draft";
}

export function planCategory(
  sub: Pick<StudioSubscription, "kind" | "individualAudience">,
) {
  if (sub.kind === "FAMILY") return "family" as const;
  return sub.individualAudience === "KID"
    ? ("kid" as const)
    : ("adult" as const);
}

export function planIcon(
  sub: Pick<
    StudioSubscription,
    "kind" | "individualAudience" | "billingCadence"
  >,
) {
  if (sub.kind === "FAMILY") return "users" as const;
  if (sub.billingCadence === "QUARTERLY" || sub.billingCadence === "YEARLY") {
    return "clock" as const;
  }
  return sub.individualAudience === "KID"
    ? ("smile" as const)
    : ("user" as const);
}

export function summarizeSubscriptions(
  plans: readonly StudioSubscription[],
): SubscriptionSummary {
  return {
    totalPlans: plans.length,
    active: plans.filter((plan) => plan.active).length,
    unused: plans.filter((plan) => isUnused(plan)).length,
    subscribers: plans.reduce(
      (sum, plan) => sum + (plan.membershipCount ?? 0),
      0,
    ),
  };
}

function matchesFacets(plan: StudioSubscription, facets: SubscriptionFacet[]) {
  if (facets.length === 0) return true;

  const audienceFacets = facets.filter(
    (facet) => facet === "adult" || facet === "kid",
  );
  const kindFacets = facets.filter(
    (facet) => facet === "individual" || facet === "family",
  );
  const wantsActive = facets.includes("active");
  const wantsUnused = facets.includes("unused");

  if (wantsActive && !plan.active) return false;
  if (wantsUnused && !isUnused(plan)) return false;

  if (audienceFacets.length > 0) {
    const category = planCategory(plan);
    const matchesAdult =
      audienceFacets.includes("adult") && category === "adult";
    const matchesKid = audienceFacets.includes("kid") && category === "kid";
    if (!matchesAdult && !matchesKid) return false;
  }

  if (kindFacets.length > 0) {
    const matchesIndividual =
      kindFacets.includes("individual") && plan.kind === "INDIVIDUAL";
    const matchesFamily =
      kindFacets.includes("family") && plan.kind === "FAMILY";
    if (!matchesIndividual && !matchesFamily) return false;
  }

  return true;
}

function cadenceRank(cadence: BillingCadence) {
  if (cadence === "YEARLY") return 12;
  if (cadence === "QUARTERLY") return 3;
  return 1;
}

function comparePlans(
  a: StudioSubscription,
  b: StudioSubscription,
  sort: SubscriptionSort,
) {
  if (sort === "price-desc") {
    return Number(b.price) - Number(a.price);
  }
  if (sort === "price-asc") {
    return Number(a.price) - Number(b.price);
  }
  if (sort === "duration") {
    return cadenceRank(a.billingCadence) - cadenceRank(b.billingCadence);
  }
  if (sort === "in-use") {
    const useDiff = Number(isInUse(b)) - Number(isInUse(a));
    if (useDiff !== 0) return useDiff;
  }
  return a.name.localeCompare(b.name);
}

export function filterSubscriptions(
  plans: readonly StudioSubscription[],
  query: SubscriptionQuery,
) {
  const search = query.search.trim().toLowerCase();
  return plans
    .filter((plan) => {
      if (query.cadence !== "ALL" && plan.billingCadence !== query.cadence) {
        return false;
      }
      if (!matchesFacets(plan, query.facets)) return false;
      if (!search) return true;
      const haystack = [
        plan.name,
        kindLabel(plan.kind),
        audienceOrPackLabel(plan),
        cadenceLabel(plan.billingCadence),
        cadenceSuffix(plan.billingCadence),
        formatPlanPrice(plan.price, plan.billingCadence),
        usageLabel(plan),
        statusLabel(plan),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    })
    .slice()
    .sort((a, b) => comparePlans(a, b, query.sort));
}

export function nextDuplicateName(
  name: string,
  existingNames: readonly string[],
) {
  const taken = new Set(existingNames.map((item) => item.toLowerCase()));
  const base = `${name} copy`;
  if (!taken.has(base.toLowerCase())) return base;
  for (let index = 2; index < 50; index += 1) {
    const candidate = `${base} ${index}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now().toString().slice(-4)}`;
}

type ActivityInvoice = {
  id: string;
  status: string;
  amount?: number | undefined;
  paidAt?: string | null | undefined;
  refundedAt?: string | null | undefined;
  periodStart?: string | null | undefined;
  paymentMethod?: string | null | undefined;
  student?: { name?: string | null | undefined } | null | undefined;
  membership?:
    | {
        periodStart?: string | null | undefined;
        subscription?:
          | {
              name?: string | null | undefined;
              billingCadence?: string | null | undefined;
            }
          | null
          | undefined;
      }
    | null
    | undefined;
};

function activityStamp(invoice: ActivityInvoice) {
  if (invoice.status === "REFUNDED") {
    return invoice.refundedAt ?? invoice.paidAt ?? invoice.periodStart ?? "";
  }
  return invoice.paidAt ?? invoice.periodStart ?? "";
}

function activityActor(invoice: ActivityInvoice) {
  if (invoice.paymentMethod === "RAZORPAY") return "System";
  if (
    invoice.paymentMethod === "CASH" ||
    invoice.paymentMethod === "UPI_MANUAL"
  ) {
    return "Staff";
  }
  const student = invoice.student?.name?.trim();
  return student || "Studio";
}

function activityVerb(invoice: ActivityInvoice): SubscriptionActivity["verb"] {
  if (invoice.status === "REFUNDED") return "Cancelled";
  if (invoice.status !== "PAID") return "Invoiced";
  const paidAt = invoice.paidAt
    ? new Date(invoice.paidAt).getTime()
    : Number.NaN;
  const periodStart = invoice.membership?.periodStart
    ? new Date(invoice.membership.periodStart).getTime()
    : invoice.periodStart
      ? new Date(invoice.periodStart).getTime()
      : Number.NaN;
  if (
    Number.isFinite(paidAt) &&
    Number.isFinite(periodStart) &&
    Math.abs(paidAt - periodStart) <= 3 * 24 * 60 * 60 * 1000
  ) {
    return "Activated";
  }
  return "Renewed";
}

export function activityFromInvoices(
  invoices: readonly ActivityInvoice[],
  limit = 6,
): SubscriptionActivity[] {
  return invoices
    .filter((invoice) => invoice.membership?.subscription?.name)
    .map((invoice) => ({
      id: invoice.id,
      planName: invoice.membership?.subscription?.name ?? "Plan",
      verb: activityVerb(invoice),
      actor: activityActor(invoice),
      at: activityStamp(invoice),
    }))
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export function subscribersFromInvoices(
  invoices: readonly ActivityInvoice[],
  planName: string,
): SubscriptionSubscriber[] {
  const seen = new Set<string>();
  const rows: SubscriptionSubscriber[] = [];
  for (const invoice of invoices) {
    if (invoice.membership?.subscription?.name !== planName) continue;
    const key = invoice.student?.name ?? invoice.id;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: invoice.id,
      name: invoice.student?.name?.trim() || "Student",
      status: invoice.status,
      amount: invoice.amount ?? 0,
    });
  }
  return rows;
}

export function formatActivityWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} · ${timePart}`;
}

export function metaLine(plan: StudioSubscription) {
  return [
    kindLabel(plan.kind),
    audienceOrPackLabel(plan),
    cadenceLabel(plan.billingCadence),
    usageLabel(plan),
  ].join(" · ");
}

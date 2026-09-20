export type SubscriptionKind = "INDIVIDUAL" | "FAMILY";
export type IndividualAudience = "ADULT" | "KID";
export type FamilyPack =
  | "TWO_KIDS"
  | "ONE_ADULT_ONE_KID"
  | "TWO_ADULTS"
  | "ONE_ADULT_TWO_KIDS"
  | "TWO_ADULTS_ONE_KID"
  | "TWO_ADULTS_TWO_KIDS";
export type BillingCadence = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type StudioSubscription = {
  id: string;
  name: string;
  kind: SubscriptionKind;
  individualAudience?: IndividualAudience | null;
  familyPack?: FamilyPack | null;
  billingCadence: BillingCadence;
  price: number | string;
  adultSeats: number;
  kidSeats: number;
  active: boolean;
  membershipCount?: number;
  batchPlanCount?: number;
  canDelete?: boolean;
};

export type CadenceFilter = "ALL" | BillingCadence;

export type SubscriptionFacet =
  | "active"
  | "unused"
  | "adult"
  | "kid"
  | "individual"
  | "family";

export type SubscriptionSort =
  | "name"
  | "price-desc"
  | "price-asc"
  | "duration"
  | "in-use";

export type SubscriptionQuery = {
  cadence: CadenceFilter;
  facets: SubscriptionFacet[];
  search: string;
  sort: SubscriptionSort;
};

export type SubscriptionSummary = {
  totalPlans: number;
  active: number;
  unused: number;
  subscribers: number;
};

export type SubscriptionActivityVerb =
  | "Activated"
  | "Renewed"
  | "Cancelled"
  | "Invoiced";

export type SubscriptionActivity = {
  id: string;
  planName: string;
  verb: SubscriptionActivityVerb;
  actor: string;
  at: string;
};

export type SubscriptionSubscriber = {
  id: string;
  name: string;
  status: string;
  amount: number;
};

import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { fetchAllPages, type Page } from "@/lib/api-page";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { formatPaidMonths } from "@/lib/format-paid-months";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { StudentBatchEnrollmentActions } from "@/modules/batches/student-batch-enrollment-actions";
import type { ChatConversation } from "@/modules/chat/types";
import { TemporaryCredentialsPanel } from "@/modules/members/temporary-credentials-panel";
import { CollectPaymentSheet } from "@/modules/payments/collect-payment-sheet";
import {
  findFamilyForStudent,
  shouldOfferFamilyCombine,
} from "@/modules/payments/family-combine";
import { FamilyCombineSheet } from "@/modules/payments/family-combine-sheet";
import {
  type Invoice,
  invoicePrintPeriod,
  invoiceTilePeriodLabel,
  type StudioFamily,
} from "@/modules/payments/invoice-types";
import { printInvoice } from "@/modules/payments/print-invoice";
import type { Studio } from "@/modules/settings/types";
import styles from "@/modules/students/student-profile.module.scss";
import { StudentSearchMultiselect } from "@/modules/students/student-search-multiselect";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { AppSheet } from "@/modules/ui/app-sheet";
import {
  DateOfBirthOrAgeFields,
  resolveAgePayload,
} from "@/modules/ui/date-of-birth-or-age";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock, SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudentStudioProfile = {
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
    styles: string[];
    active: boolean;
    dateOfBirth?: string | null;
    age?: number | null;
    guardianName?: string | null;
    alternateMobile?: string | null;
  };
  paidMonths?: number;
  batches: Array<{
    id: string;
    name: string;
    active: boolean;
    category: "KIDS" | "ADULTS";
    enrollmentStatus?: "ACTIVE" | "ENDED";
    enrolledAt?: string;
    endedAt?: string | null;
  }>;
  memberships: Array<{
    id: string;
    status: "ACTIVE" | "DUE" | "EXPIRED";
    periodStart: string;
    periodEnd: string;
    subscription: {
      id: string;
      name: string;
      kind: string;
      billingCadence: "MONTHLY" | "QUARTERLY";
      price: number | string;
    };
  }>;
  pastMembershipCount?: number;
  attendance: {
    total: number;
    present: number;
    absent: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    referralDiscount?: number;
    studioDiscount?: number;
    gstPercent?: number;
    status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
    paymentMethod?: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
    paidAt?: string | null;
    dueDate?: string | null;
    paymentHoldExpiresAt?: string | null;
    periodStart: string;
    periodEnd: string;
    billMonthKeys: string[];
    billPeriodLabel: string;
    batchId?: string | null;
    batchName?: string | null;
    chargeType?:
      | "POSTPAID_PRORATED"
      | "PREPAID_PRORATED"
      | "PREPAID_FULL"
      | "ADMISSION";
    membership?: {
      periodStart?: string | null;
      periodEnd?: string | null;
      subscription?: { billingCadence?: "MONTHLY" | "QUARTERLY" } | null;
    } | null;
  }>;
  invoiceCount?: number;
  parents: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
  }>;
  family: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
    relation: "PARENT" | "KID" | "CO_STUDENT" | "FAMILY";
  }>;
};

type SheetKind =
  | "edit"
  | "link-family"
  | "delete"
  | "toggle-active"
  | "reset-password"
  | "attendance"
  | "invoices"
  | "activity"
  | null;

type ProfileInvoice = StudentStudioProfile["invoices"][number];
type ProfileMembership = StudentStudioProfile["memberships"][number];

type InvoiceStatusFilter = "ALL" | "PENDING" | "OVERDUE" | "PAID" | "REFUNDED";
type InvoiceSort = "newest" | "oldest";

function familyRelationLabel(
  relation: StudentStudioProfile["family"][number]["relation"],
) {
  switch (relation) {
    case "PARENT":
      return "Parent";
    case "KID":
      return "Kid";
    case "CO_STUDENT":
      return "Family";
    case "FAMILY":
      return "Family";
  }
}

type TemporaryCredentials = {
  email: string;
  temporaryPassword: string;
};

export const Route = createFileRoute("/app/students/$id")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: StudentDetailPage,
});

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function membershipStatusLabel(
  status: StudentStudioProfile["memberships"][number]["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "DUE":
      return "Due";
    case "EXPIRED":
      return "Expired";
  }
}

function invoiceStatusVariant(
  status: StudentStudioProfile["invoices"][number]["status"],
) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "OVERDUE":
      return "danger" as const;
    case "PENDING":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function membershipStatusVariant(
  status: StudentStudioProfile["memberships"][number]["status"],
) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "DUE":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function isCurrentMembership(
  membership: StudentStudioProfile["memberships"][number],
) {
  return membership.status === "ACTIVE" || membership.status === "DUE";
}

function paymentMethodLabel(
  method: StudentStudioProfile["invoices"][number]["paymentMethod"],
) {
  if (!method) return null;
  return method.replaceAll("_", " ");
}

function invoiceSubtitle(
  invoice: StudentStudioProfile["invoices"][number],
): string {
  const parts = [
    invoice.batchName,
    invoice.paidAt
      ? paymentMethodLabel(invoice.paymentMethod)
      : invoice.membership?.subscription?.billingCadence === "QUARTERLY"
        ? "Quarterly"
        : invoiceTilePeriodLabel(invoice),
  ].filter(Boolean);
  return parts.join(" · ") || "Invoice";
}

function StudentDetailPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudentDetailPage");

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGuardianName, setEditGuardianName] = useState("");
  const [editAlternateMobile, setEditAlternateMobile] = useState("");
  const [collectInvoiceId, setCollectInvoiceId] = useState<string | null>(null);
  const [familyOpenId, setFamilyOpenId] = useState<string | null>(null);
  const [payFamily, setPayFamily] = useState<StudioFamily | null>(null);
  const [payPreselectedIds, setPayPreselectedIds] = useState<string[]>([]);
  const [familyMemberIds, setFamilyMemberIds] = useState<string[]>([]);
  const [resetCredentials, setResetCredentials] =
    useState<TemporaryCredentials | null>(null);
  const [pastSubsOpen, setPastSubsOpen] = useState(false);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] =
    useState<InvoiceStatusFilter>("ALL");
  const [invoiceBatchFilter, setInvoiceBatchFilter] = useState("ALL");
  const [invoiceSort, setInvoiceSort] = useState<InvoiceSort>("newest");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [billingInvoicesEnabled, setBillingInvoicesEnabled] = useState(false);

  const query = useQuery({
    queryKey: ["student-profile", studioId, id],
    queryFn: () =>
      api.get<StudentStudioProfile>(`/users/studio/${studioId}/students/${id}`),
  });

  const studioQuery = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => api.get<Studio>(`/studios/${studioId}`),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices", studioId],
    enabled: Boolean(studioId) && billingInvoicesEnabled,
    queryFn: () =>
      fetchAllPages<Invoice>((cursor) => {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);
        return api.get<
          | Invoice[]
          | { items: Invoice[]; nextCursor: string | null; limit: number }
        >(`/billing/studio/${studioId}?${params.toString()}`);
      }),
  });

  const familiesQuery = useQuery({
    queryKey: ["studio-families", studioId],
    enabled: Boolean(studioId),
    queryFn: () =>
      api.get<StudioFamily[]>(`/users/studio/${studioId}/families`),
  });

  const pastMembershipsQuery = useQuery({
    queryKey: ["student-memberships-history", studioId, id, "past"],
    enabled: Boolean(studioId && id && pastSubsOpen),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "50",
        scope: "past",
      });
      const page = await api.get<Page<ProfileMembership>>(
        `/users/studio/${studioId}/students/${id}/memberships?${params}`,
      );
      return page.items;
    },
  });

  const invoiceHistoryQuery = useInfiniteQuery({
    queryKey: [
      "student-invoices-history",
      studioId,
      id,
      invoiceStatusFilter,
      invoiceBatchFilter,
      invoiceSort,
      invoiceQuery.trim(),
    ],
    enabled: Boolean(studioId && id && sheet === "invoices"),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: "25",
        sort: invoiceSort,
      });
      if (pageParam) params.set("cursor", pageParam);
      if (invoiceStatusFilter !== "ALL") {
        params.set("status", invoiceStatusFilter);
      }
      if (invoiceBatchFilter !== "ALL") {
        params.set("batchName", invoiceBatchFilter);
      }
      const q = invoiceQuery.trim();
      if (q) params.set("q", q);
      return api.get<Page<ProfileInvoice>>(
        `/users/studio/${studioId}/students/${id}/invoices?${params}`,
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const linkedFamilyIds = useMemo(() => {
    const linked = query.data?.family ?? query.data?.parents ?? [];
    return [id, ...linked.map((member) => member.id)];
  }, [id, query.data?.family, query.data?.parents]);

  async function invalidateStudent() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["student-profile", studioId, id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["student-memberships-history", studioId, id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["student-invoices-history", studioId, id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["studio-students-search", studioId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["student-directory", studioId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["student-funnel", studioId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["invoices", studioId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["studio-families", studioId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["batches", studioId],
      }),
    ]);
  }

  function closeSheet() {
    setSheet(null);
    setFamilyMemberIds([]);
    setResetCredentials(null);
    setInvoiceQuery("");
    setInvoiceStatusFilter("ALL");
    setInvoiceBatchFilter("ALL");
    setInvoiceSort("newest");
    setSelectedInvoiceId(null);
  }

  function openInvoicesSheet() {
    setInvoiceQuery("");
    setInvoiceStatusFilter("ALL");
    setInvoiceBatchFilter("ALL");
    setInvoiceSort("newest");
    setSelectedInvoiceId(null);
    setSheet("invoices");
  }

  async function loadStudioInvoices() {
    setBillingInvoicesEnabled(true);
    return queryClient.fetchQuery({
      queryKey: ["invoices", studioId],
      queryFn: () =>
        fetchAllPages<Invoice>((cursor) => {
          const params = new URLSearchParams({ limit: "50" });
          if (cursor) params.set("cursor", cursor);
          return api.get<
            | Invoice[]
            | { items: Invoice[]; nextCursor: string | null; limit: number }
          >(`/billing/studio/${studioId}?${params.toString()}`);
        }),
    });
  }

  function openEdit() {
    const student = query.data?.student;
    if (!student) return;
    setEditName(student.name);
    setEditPhone(student.phone ?? "");
    setEditDateOfBirth(student.dateOfBirth ?? "");
    setEditAge(
      student.age !== null && student.age !== undefined
        ? String(student.age)
        : "",
    );
    setEditGuardianName(student.guardianName ?? "");
    setEditAlternateMobile(student.alternateMobile ?? "");
    setSheet("edit");
  }

  async function openMarkPaid(invoiceId: string) {
    const studioInvoices = await loadStudioInvoices();
    const family = findFamilyForStudent(familiesQuery.data ?? [], id);
    if (shouldOfferFamilyCombine(family, studioInvoices)) {
      setPayPreselectedIds([invoiceId]);
      setPayFamily(family);
      return;
    }
    setCollectInvoiceId(invoiceId);
  }

  function openLinkFamily() {
    setFamilyMemberIds([]);
    setSheet("link-family");
  }

  function openDelete() {
    setSheet("delete");
  }

  function openToggleActive() {
    setSheet("toggle-active");
  }

  function openResetPassword() {
    setResetCredentials(null);
    setSheet("reset-password");
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copied`,
        variant: "success",
      });
    } catch {
      toast({
        title: `Couldn’t copy ${label.toLowerCase()}`,
        variant: "error",
      });
    }
  }

  const deleteStudent = useMutation({
    mutationFn: () => api.delete(`/users/studio/${studioId}/students/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["studio-students-search", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-directory", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-funnel", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["batches", studioId],
        }),
        queryClient.removeQueries({
          queryKey: ["student-profile", studioId, id],
        }),
      ]);
      toast({
        title: "Student deleted",
        description: "The student was removed from this studio.",
        variant: "success",
      });
      await navigate({ to: "/app/students" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t delete student",
        description:
          error instanceof Error ? error.message : "Could not delete student.",
        variant: "error",
      });
    },
  });

  const updateStudent = useMutation({
    mutationFn: (payload: {
      name?: string;
      phone?: string;
      dateOfBirth?: string;
      age?: number;
      guardianName?: string;
      alternateMobile?: string;
      active?: boolean;
    }) => api.patch(`/users/studio/${studioId}/students/${id}`, payload),
    onSuccess: async (_data, variables) => {
      await invalidateStudent();
      closeSheet();
      if (variables.active !== undefined) {
        toast({
          title: variables.active
            ? "Student reactivated"
            : "Student deactivated",
          description: variables.active
            ? "They can access the member app again."
            : "They no longer have access to the member app.",
          variant: "success",
        });
      } else {
        toast({
          title: "Profile saved",
          description: "Student profile updated.",
          variant: "success",
        });
      }
    },
    onError: (error: unknown, variables) => {
      toast({
        title:
          variables.active !== undefined
            ? "Couldn’t update student"
            : "Couldn’t save profile",
        description:
          error instanceof Error ? error.message : "Could not update student.",
        variant: "error",
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: () =>
      api.post<TemporaryCredentials>(
        `/users/studio/${studioId}/students/${id}/reset-password`,
        {},
      ),
    onSuccess: (result) => {
      setResetCredentials({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
      toast({
        title: "Temporary password ready",
        description: "Share it once — shown only on this screen.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t reset password",
        description:
          error instanceof Error
            ? error.message
            : "Could not generate a temporary password.",
        variant: "error",
      });
    },
  });

  const linkFamily = useMutation({
    mutationFn: (memberUserIds: string[]) =>
      api.post(`/users/studio/${studioId}/families/link`, {
        anchorUserId: id,
        memberUserIds,
      }),
    onSuccess: async () => {
      await invalidateStudent();
      await queryClient.invalidateQueries({
        queryKey: ["studio-families", studioId],
      });
      closeSheet();
      toast({
        title: "Family linked",
        description: "Selected accounts are now one family with this student.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t link family",
        description:
          error instanceof Error ? error.message : "Could not link family.",
        variant: "error",
      });
    },
  });

  const messageStudent = useMutation({
    mutationFn: () =>
      api.post<ChatConversation>("/chat/conversations", {
        type: "DM",
        memberIds: [id],
      }),
    onSuccess: (conversation) => {
      toast({
        title: "Conversation opened",
        description: "You can message this student now.",
        variant: "success",
      });
      void navigate({
        to: "/app/messages/$id",
        params: { id: conversation.id },
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t start conversation",
        description:
          error instanceof Error
            ? error.message
            : "Could not start conversation.",
        variant: "error",
      });
    },
  });

  const profile = query.data;
  const family = useMemo(() => {
    if (profile?.family) return profile.family;
    return (profile?.parents ?? []).map((member) => ({
      ...member,
      relation: "PARENT" as const,
    }));
  }, [profile?.family, profile?.parents]);

  const currentMemberships = profile?.memberships ?? [];
  const pastMembershipCount = profile?.pastMembershipCount ?? 0;
  const pastMemberships = pastMembershipsQuery.data ?? [];
  const recentInvoices = profile?.invoices ?? [];
  const invoiceCount = profile?.invoiceCount ?? recentInvoices.length;

  const historyInvoices = useMemo(
    () => invoiceHistoryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [invoiceHistoryQuery.data],
  );

  const invoiceBatchOptions = useMemo(() => {
    const names = new Set<string>();
    for (const batch of profile?.batches ?? []) {
      names.add(batch.name);
    }
    for (const invoice of recentInvoices) {
      if (invoice.batchName) names.add(invoice.batchName);
    }
    for (const invoice of historyInvoices) {
      if (invoice.batchName) names.add(invoice.batchName);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [profile?.batches, recentInvoices, historyInvoices]);

  const studioInvoices = invoicesQuery.data ?? [];
  const collectInvoice =
    studioInvoices.find((invoice) => invoice.id === collectInvoiceId) ?? null;
  const familyInvoice =
    studioInvoices.find((invoice) => invoice.id === familyOpenId) ?? null;
  const selectedProfileInvoice =
    recentInvoices.find((invoice) => invoice.id === selectedInvoiceId) ??
    historyInvoices.find((invoice) => invoice.id === selectedInvoiceId) ??
    null;

  const actionError =
    deleteStudent.error ??
    updateStudent.error ??
    resetPassword.error ??
    linkFamily.error ??
    messageStudent.error;

  function handleAction(actionId: string | number) {
    if (actionId === "message") {
      messageStudent.mutate();
      return;
    }
    if (actionId === "edit") {
      openEdit();
      return;
    }
    if (actionId === "link-family") {
      openLinkFamily();
      return;
    }
    if (actionId === "reset-password") {
      openResetPassword();
      return;
    }
    if (actionId === "toggle-active") {
      openToggleActive();
      return;
    }
    if (actionId === "delete") {
      openDelete();
    }
  }

  function printProfileInvoice(
    invoice: StudentStudioProfile["invoices"][number],
  ) {
    if (!profile) return;
    const period = invoicePrintPeriod(invoice);
    const opened = printInvoice({
      id: invoice.id,
      amount: invoice.amount,
      referralDiscount: invoice.referralDiscount,
      studioDiscount: invoice.studioDiscount,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt,
      billMonth: period.billMonth,
      billMonthKeys: period.billMonthKeys,
      billPeriodLabel: period.billPeriodLabel,
      studentName: profile.student.name,
      studioName: studioQuery.data?.name,
      studioLogoUrl: studioQuery.data?.logoUrl,
      studioAddress: studioQuery.data?.address,
      gstNumber: studioQuery.data?.settings?.gstNumber,
      gstPercent: invoice.gstPercent,
    });
    if (!opened) {
      toast({
        title: "Couldn't open print window",
        description: "Allow pop-ups for this site, then try again.",
        variant: "error",
      });
    }
  }

  return (
    <Screen
      title={profile?.student.name ?? "Student"}
      subtitle="Enrollment, billing, and attendance."
      showBack
      backTo="/app/students"
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        {actionError ? (
          <p className={staff.panelDesc} role="alert">
            {actionError instanceof Error
              ? actionError.message
              : "Something went wrong."}
          </p>
        ) : null}

        {query.isLoading ? (
          <div className={styles.overview}>
            <SkeletonBlock height="7rem" radius="var(--radius-2xl)" />
            <div className={styles.metricRow}>
              <SkeletonBlock height="3.25rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="3.25rem" radius="var(--radius-2xl)" />
            </div>
            <SkeletonCardList count={3} />
          </div>
        ) : null}

        {query.isError ? (
          <ErrorState
            description={
              query.error instanceof Error
                ? query.error.message
                : "Could not load this student."
            }
            action={
              <TouchButton variant="primary" onClick={() => query.refetch()}>
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {profile ? (
          <div className={styles.overview}>
            <div className={styles.headerCard}>
              <div className={styles.headerTop}>
                <Avatar size="lg" className={staff.trainerAvatar}>
                  {profile.student.photoUrl ? (
                    <AvatarImage
                      src={profile.student.photoUrl}
                      alt={profile.student.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {profile.student.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={styles.headerIdentity}>
                  <div className={styles.headerNameRow}>
                    <span className={staff.rowTitle}>
                      {profile.student.name}
                    </span>
                    <Badge
                      appearance="subtle"
                      data-testid="student-paid-months"
                    >
                      {formatPaidMonths(profile.paidMonths ?? 0)}
                    </Badge>
                    {!profile.student.active ? (
                      <Badge variant="neutral">Inactive</Badge>
                    ) : null}
                  </div>
                  <div className={styles.facts}>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>Age / DOB</span>
                      <span className={styles.factValue}>
                        {profile.student.age !== null &&
                        profile.student.age !== undefined
                          ? `Age ${profile.student.age}`
                          : "—"}
                        {profile.student.dateOfBirth
                          ? ` · ${profile.student.dateOfBirth}`
                          : ""}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>Phone</span>
                      <span className={styles.factValue}>
                        {profile.student.phone || "No phone on file"}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>Email</span>
                      <span className={styles.factValue}>
                        {profile.student.email}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>Guardian</span>
                      <span className={styles.factValue}>
                        {profile.student.guardianName || "—"}
                      </span>
                    </div>
                    <div className={styles.fact}>
                      <span className={styles.factLabel}>
                        Alternate contact
                      </span>
                      <span className={styles.factValue}>
                        {profile.student.alternateMobile || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <Menu>
                  <TouchButton
                    size="sm"
                    variant="quiet"
                    aria-label="Student actions"
                    data-testid="student-actions"
                  >
                    <Icon name="more-horizontal" />
                  </TouchButton>
                  <MenuContent
                    placement="bottom end"
                    onAction={handleAction}
                    aria-label="Student actions"
                  >
                    <MenuItem id="message" textValue="Message">
                      <MenuItemLabel>Message</MenuItemLabel>
                    </MenuItem>
                    <MenuItem id="edit" textValue="Edit profile">
                      <MenuItemLabel>Edit profile</MenuItemLabel>
                    </MenuItem>
                    <MenuItem id="link-family" textValue="Link Family">
                      <MenuItemLabel>Link Family</MenuItemLabel>
                    </MenuItem>
                    <MenuItem id="reset-password" textValue="Reset password">
                      <MenuItemLabel>Reset password</MenuItemLabel>
                    </MenuItem>
                    <MenuItem
                      id="toggle-active"
                      textValue={
                        profile.student.active ? "Deactivate" : "Reactivate"
                      }
                    >
                      <MenuItemLabel>
                        {profile.student.active ? "Deactivate" : "Reactivate"}
                      </MenuItemLabel>
                    </MenuItem>
                    <MenuItem id="delete" textValue="Delete" variant="danger">
                      <MenuItemLabel>Delete</MenuItemLabel>
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <div className={styles.headerActions}>
                <TouchButton
                  size="sm"
                  variant="default"
                  data-testid="edit-student-profile"
                  onClick={openEdit}
                >
                  Edit profile
                </TouchButton>
                <TouchButton
                  size="sm"
                  variant="primary"
                  isPending={messageStudent.isPending}
                  data-testid="message-student"
                  onClick={() => messageStudent.mutate()}
                >
                  Message
                </TouchButton>
              </div>
            </div>

            <div className={styles.metricRow}>
              <button
                type="button"
                className={styles.metricButton}
                data-testid="attendance-present"
                onClick={() => setSheet("attendance")}
              >
                <span className={staff.metricIcon} aria-hidden>
                  <Icon name="calendar" />
                </span>
                <span className={styles.metricBody}>
                  <span className={styles.metricNumber}>
                    {profile.attendance.present}
                  </span>
                  <span className={styles.metricCaption}>
                    sessions attended
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.metricChevron} />
              </button>
              <button
                type="button"
                className={styles.metricButton}
                data-testid="attendance-absent"
                onClick={() => setSheet("attendance")}
              >
                <span className={staff.metricIcon} aria-hidden>
                  <Icon name="rotate-cw" />
                </span>
                <span className={styles.metricBody}>
                  <span className={styles.metricNumber}>
                    {profile.attendance.absent}
                  </span>
                  <span className={styles.metricCaption}>missed sessions</span>
                </span>
                <Icon name="chevron-right" className={styles.metricChevron} />
              </button>
            </div>

            <section className={styles.section}>
              <h2 className={staff.sectionTitle}>Batches</h2>
              {profile.batches.length === 0 ? (
                <EmptyState
                  icon={ENTITY_ICONS.batch}
                  title="No batches"
                  description="This student is not enrolled in any batches yet."
                />
              ) : (
                <div className={styles.stack}>
                  {profile.batches.map((batch) => {
                    const isActiveEnrollment =
                      batch.enrollmentStatus !== "ENDED";
                    return (
                      <div key={batch.id} className={styles.rowCard}>
                        <div
                          className={`${styles.rowMain} ${styles.rowMainStatic}`}
                        >
                          <span className={styles.rowIcon} aria-hidden>
                            <Icon name={ENTITY_ICONS.batch} />
                          </span>
                          <div className={styles.rowText}>
                            <span className={styles.rowTitle}>
                              {batch.name}
                            </span>
                            <span className={styles.rowMeta}>
                              {batch.category === "KIDS" ? "Kids" : "Adults"}
                              {batch.enrolledAt
                                ? ` · Since ${formatDate(batch.enrolledAt)}`
                                : ""}
                            </span>
                          </div>
                          {batch.enrollmentStatus === "ENDED" ? (
                            <Badge variant="neutral">Unenrolled</Badge>
                          ) : null}
                        </div>
                        {isActiveEnrollment ? (
                          <div className={styles.batchActions}>
                            <StudentBatchEnrollmentActions
                              studentId={profile.student.id}
                              studentName={profile.student.name}
                              batchId={batch.id}
                              batchName={batch.name}
                              onOpenBatch={() =>
                                void navigate({
                                  to: "/app/batches/$id",
                                  params: { id: batch.id },
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className={styles.batchActions}>
                            <TouchButton
                              size="sm"
                              variant="default"
                              data-testid={`open-batch-${batch.id}`}
                              onClick={() =>
                                void navigate({
                                  to: "/app/batches/$id",
                                  params: { id: batch.id },
                                })
                              }
                            >
                              Open
                            </TouchButton>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={staff.sectionTitle}>Subscriptions</h2>
              {currentMemberships.length === 0 && pastMembershipCount === 0 ? (
                <EmptyState
                  title="No subscriptions"
                  description="Enroll this student in a batch with a linked plan to start billing."
                />
              ) : (
                <div className={styles.stack}>
                  {currentMemberships.map((membership) => (
                    <div key={membership.id} className={styles.rowCard}>
                      <div
                        className={`${styles.rowMain} ${styles.rowMainStatic}`}
                      >
                        <span className={styles.rowIcon} aria-hidden>
                          <Icon name="credit-card" />
                        </span>
                        <div className={styles.rowText}>
                          <span className={styles.rowMeta}>
                            {isCurrentMembership(membership)
                              ? "Active subscription"
                              : "Latest subscription"}
                          </span>
                          <span className={styles.rowTitle}>
                            {membership.subscription.name}
                          </span>
                          <span className={styles.rowMeta}>
                            {formatDate(membership.periodStart)} –{" "}
                            {formatDate(membership.periodEnd)}
                          </span>
                          <span className={styles.rowMeta}>
                            {formatInr(Number(membership.subscription.price))}
                            {membership.subscription.billingCadence ===
                            "QUARTERLY"
                              ? " / quarter"
                              : " / month"}
                          </span>
                        </div>
                        <div className={styles.rowEnd}>
                          <Badge
                            variant={membershipStatusVariant(membership.status)}
                          >
                            {membershipStatusLabel(membership.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pastMembershipCount > 0 ? (
                    <>
                      <button
                        type="button"
                        className={styles.pastTrigger}
                        data-open={pastSubsOpen ? "true" : undefined}
                        data-testid="past-subscriptions-toggle"
                        aria-expanded={pastSubsOpen}
                        onClick={() => setPastSubsOpen((open) => !open)}
                      >
                        <span>Past subscriptions ({pastMembershipCount})</span>
                        <Icon
                          name="chevron-right"
                          className={styles.rowChevron}
                        />
                      </button>
                      {pastSubsOpen ? (
                        <div className={styles.pastPanel}>
                          {pastMembershipsQuery.isLoading ? (
                            <p className={styles.rowMeta}>Loading history…</p>
                          ) : null}
                          {pastMembershipsQuery.isError ? (
                            <ErrorState
                              description={
                                pastMembershipsQuery.error instanceof Error
                                  ? pastMembershipsQuery.error.message
                                  : "Could not load past subscriptions."
                              }
                              action={
                                <TouchButton
                                  variant="primary"
                                  onClick={() => pastMembershipsQuery.refetch()}
                                >
                                  Try again
                                </TouchButton>
                              }
                            />
                          ) : null}
                          {pastMemberships.map((membership) => (
                            <div key={membership.id} className={styles.rowCard}>
                              <div
                                className={`${styles.rowMain} ${styles.rowMainStatic}`}
                              >
                                <div className={styles.rowText}>
                                  <span className={styles.rowTitle}>
                                    {membership.subscription.name}
                                  </span>
                                  <span className={styles.rowMeta}>
                                    {formatDate(membership.periodStart)} –{" "}
                                    {formatDate(membership.periodEnd)}
                                  </span>
                                  <span className={styles.rowMeta}>
                                    {formatInr(
                                      Number(membership.subscription.price),
                                    )}
                                    {membership.subscription.billingCadence ===
                                    "QUARTERLY"
                                      ? " / quarter"
                                      : " / month"}
                                  </span>
                                </div>
                                <Badge
                                  variant={membershipStatusVariant(
                                    membership.status,
                                  )}
                                >
                                  {membershipStatusLabel(membership.status)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={staff.sectionTitle}>Invoices</h2>
                {invoiceCount > 0 ? (
                  <button
                    type="button"
                    className={styles.viewAll}
                    data-testid="view-all-invoices"
                    onClick={openInvoicesSheet}
                  >
                    View all
                    <Icon name="arrow-right" className={styles.viewAllIcon} />
                  </button>
                ) : null}
              </div>
              {invoiceCount === 0 ? (
                <EmptyState
                  title="No invoices"
                  description="Invoices will appear here once billing starts."
                />
              ) : (
                <div className={styles.stack}>
                  {recentInvoices.map((invoice) => {
                    const periodLabel = invoiceTilePeriodLabel(invoice);
                    return (
                      <button
                        key={invoice.id}
                        type="button"
                        className={styles.rowCard}
                        data-testid={`invoice-row-${invoice.id}`}
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                      >
                        <span className={styles.rowMain}>
                          <span className={styles.rowIcon} aria-hidden>
                            <Icon name="file-text" />
                          </span>
                          <div className={styles.rowText}>
                            <span
                              className={styles.rowTitle}
                              data-testid={`invoice-months-${invoice.id}`}
                            >
                              {periodLabel || formatDate(invoice.periodStart)}
                            </span>
                            <span className={styles.rowMeta}>
                              {invoiceSubtitle(invoice)}
                            </span>
                          </div>
                          <div className={styles.rowEnd}>
                            <span className={styles.rowAmount}>
                              {formatInr(invoice.amount)}
                            </span>
                            <Badge
                              variant={invoiceStatusVariant(invoice.status)}
                            >
                              {invoice.status}
                            </Badge>
                            <Icon
                              name="chevron-right"
                              className={styles.rowChevron}
                            />
                          </div>
                        </span>
                      </button>
                    );
                  })}
                  {invoiceCount > recentInvoices.length ? (
                    <p className={styles.rowMeta}>
                      Showing latest {recentInvoices.length} of {invoiceCount}{" "}
                      invoices.
                    </p>
                  ) : null}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={staff.sectionTitle}>Family</h2>
                <TouchButton
                  size="sm"
                  variant="quiet"
                  data-testid="link-family"
                  onClick={openLinkFamily}
                >
                  Link Family
                </TouchButton>
              </div>
              {family.length === 0 ? (
                <div className={styles.compactEmpty}>
                  <span className={styles.compactEmptyIcon} aria-hidden>
                    <Icon name="users" />
                  </span>
                  <span className={styles.compactEmptyTitle}>
                    No linked family
                  </span>
                  <span className={styles.compactEmptyDesc}>
                    Link parents or siblings for combined billing and shared
                    context.
                  </span>
                  <TouchButton
                    size="sm"
                    variant="primary"
                    onClick={openLinkFamily}
                  >
                    Link Family
                  </TouchButton>
                </div>
              ) : (
                <div className={styles.stack}>
                  {family.map((member) => (
                    <div key={member.id} className={styles.rowCard}>
                      <div
                        className={`${styles.rowMain} ${styles.rowMainStatic}`}
                      >
                        <div className={styles.rowText}>
                          <span className={styles.rowTitle}>{member.name}</span>
                          <span className={styles.rowMeta}>
                            {[member.email, member.phone]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                        <Badge appearance="subtle">
                          {familyRelationLabel(member.relation)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className={styles.navStack}>
              <button
                type="button"
                className={styles.navRow}
                data-testid="payments-invoices-nav"
                onClick={openInvoicesSheet}
              >
                <span className={styles.rowIcon} aria-hidden>
                  <Icon name="wallet" />
                </span>
                <span className={styles.navText}>
                  <span className={styles.navTitle}>
                    Payments &amp; Invoices
                  </span>
                  <span className={styles.navDesc}>
                    Full transaction history, payment methods and related
                    records
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.rowChevron} />
              </button>
              <button
                type="button"
                className={styles.navRow}
                data-testid="notes-activity-nav"
                onClick={() => setSheet("activity")}
              >
                <span className={styles.rowIcon} aria-hidden>
                  <Icon name="message-square" />
                </span>
                <span className={styles.navText}>
                  <span className={styles.navTitle}>Notes &amp; Activity</span>
                  <span className={styles.navDesc}>
                    Follow-ups, remarks and activity history
                  </span>
                </span>
                <Icon name="chevron-right" className={styles.rowChevron} />
              </button>
            </div>
          </div>
        ) : null}
      </PullToRefresh>

      <AppSheet
        isOpen={sheet === "attendance"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Attendance summary"
      >
        <div className={staff.sheetStack}>
          <div className={styles.metricRow}>
            <div className={styles.rowCard}>
              <span className={styles.rowMeta}>Attended</span>
              <span className={styles.metricNumber}>
                {profile?.attendance.present ?? 0}
              </span>
            </div>
            <div className={styles.rowCard}>
              <span className={styles.rowMeta}>Missed</span>
              <span className={styles.metricNumber}>
                {profile?.attendance.absent ?? 0}
              </span>
            </div>
          </div>
          <p className={staff.rowMeta}>
            {(profile?.attendance.total ?? 0) === 0
              ? "No attendance records yet for this student."
              : `${profile?.attendance.total ?? 0} sessions recorded in total. Open a batch for full session history.`}
          </p>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={sheet === "invoices"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Invoice history"
        size="wide"
      >
        <div className={staff.sheetStack}>
          <div className={styles.filterBar}>
            <FormInput
              label="Search invoices"
              value={invoiceQuery}
              onChange={setInvoiceQuery}
              placeholder="Batch, status, amount…"
              data-testid="invoice-history-search"
            />
            <div className={styles.filterRow}>
              <Select
                selectedKey={invoiceStatusFilter}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setInvoiceStatusFilter(key as InvoiceStatusFilter);
                  }
                }}
              >
                <SelectTrigger data-testid="invoice-history-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="ALL" textValue="All statuses">
                    All statuses
                  </SelectItem>
                  <SelectItem id="OVERDUE" textValue="Overdue">
                    Overdue
                  </SelectItem>
                  <SelectItem id="PENDING" textValue="Pending">
                    Pending
                  </SelectItem>
                  <SelectItem id="PAID" textValue="Paid">
                    Paid
                  </SelectItem>
                  <SelectItem id="REFUNDED" textValue="Refunded">
                    Refunded
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                selectedKey={invoiceBatchFilter}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    setInvoiceBatchFilter(key);
                  }
                }}
              >
                <SelectTrigger data-testid="invoice-history-batch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="ALL" textValue="All batches">
                    All batches
                  </SelectItem>
                  {invoiceBatchOptions.map((batchName) => (
                    <SelectItem
                      key={batchName}
                      id={batchName}
                      textValue={batchName}
                    >
                      {batchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                selectedKey={invoiceSort}
                onSelectionChange={(key) => {
                  if (key === "newest" || key === "oldest") {
                    setInvoiceSort(key);
                  }
                }}
              >
                <SelectTrigger data-testid="invoice-history-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="newest" textValue="Newest first">
                    Newest first
                  </SelectItem>
                  <SelectItem id="oldest" textValue="Oldest first">
                    Oldest first
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {invoiceHistoryQuery.isLoading ? (
            <SkeletonCardList count={4} />
          ) : null}
          {invoiceHistoryQuery.isError ? (
            <ErrorState
              description={
                invoiceHistoryQuery.error instanceof Error
                  ? invoiceHistoryQuery.error.message
                  : "Could not load invoice history."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => invoiceHistoryQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {!invoiceHistoryQuery.isLoading &&
          !invoiceHistoryQuery.isError &&
          historyInvoices.length === 0 ? (
            <EmptyState
              title="No matching invoices"
              description="Try a different search or filter."
            />
          ) : null}
          {historyInvoices.length > 0 ? (
            <div className={styles.sheetList}>
              {historyInvoices.map((invoice) => {
                const periodLabel = invoiceTilePeriodLabel(invoice);
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    className={styles.rowCard}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <span className={styles.rowMain}>
                      <span className={styles.rowIcon} aria-hidden>
                        <Icon name="file-text" />
                      </span>
                      <div className={styles.rowText}>
                        <span className={styles.rowTitle}>
                          {periodLabel || formatDate(invoice.periodStart)}
                        </span>
                        <span className={styles.rowMeta}>
                          {invoiceSubtitle(invoice)}
                        </span>
                      </div>
                      <div className={styles.rowEnd}>
                        <span className={styles.rowAmount}>
                          {formatInr(invoice.amount)}
                        </span>
                        <Badge variant={invoiceStatusVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                        <Icon
                          name="chevron-right"
                          className={styles.rowChevron}
                        />
                      </div>
                    </span>
                  </button>
                );
              })}
              {invoiceHistoryQuery.hasNextPage ? (
                <TouchButton
                  variant="default"
                  fullWidth
                  isPending={invoiceHistoryQuery.isFetchingNextPage}
                  data-testid="invoice-history-load-more"
                  onClick={() => void invoiceHistoryQuery.fetchNextPage()}
                >
                  Load more
                </TouchButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </AppSheet>

      <AppSheet
        isOpen={sheet === "activity"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Notes & activity"
      >
        <div className={staff.sheetStack}>
          <EmptyState
            title="No notes yet"
            description="Follow-ups, remarks, and activity for this student will show up here."
          />
        </div>
      </AppSheet>

      <AppSheet
        isOpen={Boolean(selectedProfileInvoice)}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoiceId(null);
        }}
        title="Invoice"
      >
        {selectedProfileInvoice ? (
          <div className={staff.sheetStack}>
            <div className={styles.rowCard}>
              <div className={`${styles.rowMain} ${styles.rowMainStatic}`}>
                <div className={styles.rowText}>
                  <span className={styles.rowTitle}>
                    {formatInr(selectedProfileInvoice.amount)}
                  </span>
                  <span className={styles.rowMeta}>
                    {invoiceTilePeriodLabel(selectedProfileInvoice) ||
                      `${formatDate(selectedProfileInvoice.periodStart)} – ${formatDate(selectedProfileInvoice.periodEnd)}`}
                  </span>
                  <span className={styles.rowMeta}>
                    {invoiceSubtitle(selectedProfileInvoice)}
                  </span>
                </div>
                <Badge
                  variant={invoiceStatusVariant(selectedProfileInvoice.status)}
                >
                  {selectedProfileInvoice.status}
                </Badge>
              </div>
            </div>
            <div className={staff.sheetActions}>
              {selectedProfileInvoice.status !== "PAID" &&
              selectedProfileInvoice.status !== "REFUNDED" ? (
                <TouchButton
                  variant="primary"
                  fullWidth
                  data-testid={`mark-paid-${selectedProfileInvoice.id}`}
                  onClick={() => void openMarkPaid(selectedProfileInvoice.id)}
                >
                  Mark paid
                </TouchButton>
              ) : (
                <TouchButton
                  variant="default"
                  fullWidth
                  data-testid={`print-invoice-${selectedProfileInvoice.id}`}
                  onClick={() => printProfileInvoice(selectedProfileInvoice)}
                >
                  Print invoice
                </TouchButton>
              )}
            </div>
          </div>
        ) : null}
      </AppSheet>

      <AppBottomSheet
        isOpen={sheet === "edit"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Edit profile"
      >
        <div className={staff.sheetStack}>
          <FormInput
            label="Name"
            value={editName}
            onChange={setEditName}
            data-testid="edit-student-name"
          />
          <FormInput
            label="Phone"
            value={editPhone}
            onChange={setEditPhone}
            type="tel"
            data-testid="edit-student-phone"
          />
          <DateOfBirthOrAgeFields
            dateOfBirth={editDateOfBirth}
            onDateOfBirthChange={setEditDateOfBirth}
            age={editAge}
            onAgeChange={setEditAge}
            hint="Either a date of birth or an exact age."
          />
          <FormInput
            label="Guardian name"
            value={editGuardianName}
            onChange={setEditGuardianName}
          />
          <FormInput
            label="Alternate mobile number"
            type="tel"
            value={editAlternateMobile}
            onChange={setEditAlternateMobile}
          />
          {updateStudent.isError ? (
            <ErrorState
              description={
                updateStudent.error instanceof Error
                  ? updateStudent.error.message
                  : "Could not update profile."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!editName.trim()}
              isPending={updateStudent.isPending}
              data-testid="save-student-profile"
              onClick={() =>
                updateStudent.mutate({
                  name: editName.trim(),
                  phone: editPhone.trim(),
                  ...resolveAgePayload({
                    dateOfBirth: editDateOfBirth,
                    age: editAge,
                  }),
                  guardianName: editGuardianName.trim(),
                  alternateMobile: editAlternateMobile.trim(),
                })
              }
            >
              Save
            </TouchButton>
          </div>
        </div>
      </AppBottomSheet>

      <CollectPaymentSheet
        invoice={collectInvoice}
        onOpenChange={(open) => {
          if (!open) setCollectInvoiceId(null);
        }}
        confirmTestId="confirm-mark-paid"
        onPaid={() => {
          void invalidateStudent();
        }}
      />

      <CollectPaymentSheet
        invoice={familyInvoice}
        onOpenChange={(open) => {
          if (!open) setFamilyOpenId(null);
        }}
        confirmTestId="confirm-open-family-paid"
        discountTestIdPrefix="family-"
        onPaid={() => {
          void invalidateStudent();
        }}
      />

      <FamilyCombineSheet
        family={payFamily}
        invoices={studioInvoices}
        preselectedInvoiceIds={payPreselectedIds}
        onOpenChange={(open) => {
          if (!open) {
            setPayFamily(null);
            setPayPreselectedIds([]);
          }
        }}
        onCombined={(invoice) => {
          void invalidateStudent();
          setFamilyOpenId(invoice.id);
        }}
        onPaySingle={(invoice) => {
          setCollectInvoiceId(invoice.id);
        }}
      />

      <AppBottomSheet
        isOpen={sheet === "link-family"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Link Family"
        size="tall"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Search students and parents in this studio, then add them as one
            family with {profile?.student.name}.
          </p>
          <StudentSearchMultiselect
            selectedIds={familyMemberIds}
            onSelectedIdsChange={setFamilyMemberIds}
            excludeIds={linkedFamilyIds}
            includeParents
            enabled={sheet === "link-family"}
            isDisabled={linkFamily.isPending}
            label="Search students"
            emptyTitle="No users found"
            emptyDescription="Try a different name or email."
          />
          <div className={staff.sheetActions}>
            {linkFamily.isError ? (
              <ErrorState
                description={
                  linkFamily.error instanceof Error
                    ? linkFamily.error.message
                    : "Could not link family."
                }
              />
            ) : null}
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={familyMemberIds.length === 0}
              isPending={linkFamily.isPending}
              data-testid="confirm-link-family"
              onClick={() => {
                if (familyMemberIds.length === 0) return;
                linkFamily.mutate(familyMemberIds);
              }}
            >
              {familyMemberIds.length > 0
                ? `Link ${familyMemberIds.length} as family`
                : "Link Family"}
            </TouchButton>
          </div>
        </div>
      </AppBottomSheet>

      <AppSheet
        isOpen={sheet === "delete"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Delete student"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Delete “{profile?.student.name}”? This removes their enrollments,
            memberships, and attendance. This cannot be undone.
          </p>
          {deleteStudent.isError ? (
            <ErrorState
              description={
                deleteStudent.error instanceof Error
                  ? deleteStudent.error.message
                  : "Could not delete student."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteStudent.isPending}
              onClick={closeSheet}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteStudent.isPending}
              data-testid="confirm-delete-student"
              onClick={() => deleteStudent.mutate()}
            >
              Delete student
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={sheet === "toggle-active"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title={
          profile?.student.active ? "Deactivate student" : "Reactivate student"
        }
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            {profile?.student.active
              ? `Deactivate “${profile.student.name}”? They will lose access to the member app. History is kept.`
              : `Reactivate “${profile?.student.name}”? They will regain access to the member app.`}
          </p>
          {updateStudent.isError ? (
            <ErrorState
              description={
                updateStudent.error instanceof Error
                  ? updateStudent.error.message
                  : "Could not update student."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={updateStudent.isPending}
              onClick={closeSheet}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant={profile?.student.active ? "danger" : "primary"}
              fullWidth
              isPending={updateStudent.isPending}
              data-testid="confirm-toggle-student-active"
              onClick={() => {
                if (!profile) return;
                updateStudent.mutate({ active: !profile.student.active });
              }}
            >
              {profile?.student.active ? "Deactivate" : "Reactivate"}
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={sheet === "reset-password"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title={
          resetCredentials ? "Temporary password" : "Reset student password"
        }
      >
        <div className={staff.sheetStack}>
          {resetCredentials ? (
            <>
              <TemporaryCredentialsPanel
                email={resetCredentials.email}
                temporaryPassword={resetCredentials.temporaryPassword}
                eyebrow="Student access"
                helpText="This password is shown once. The student must set a new password on first login."
                onCopy={(label, value) => void copyText(label, value)}
              />
              <div className={staff.sheetActions}>
                <TouchButton
                  variant="primary"
                  fullWidth
                  data-testid="reset-password-done"
                  onClick={closeSheet}
                >
                  Done
                </TouchButton>
              </div>
            </>
          ) : (
            <>
              <p className={staff.rowMeta}>
                Generate a new temporary password for “{profile?.student.name}”?
                Their current password will stop working, and they’ll need to
                change this one on next login.
              </p>
              {resetPassword.isError ? (
                <ErrorState
                  description={
                    resetPassword.error instanceof Error
                      ? resetPassword.error.message
                      : "Could not reset password."
                  }
                />
              ) : null}
              <div className={staff.sheetActions}>
                <TouchButton
                  variant="default"
                  fullWidth
                  isDisabled={resetPassword.isPending}
                  onClick={closeSheet}
                >
                  Cancel
                </TouchButton>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isPending={resetPassword.isPending}
                  data-testid="confirm-reset-student-password"
                  onClick={() => resetPassword.mutate()}
                >
                  Generate temporary password
                </TouchButton>
              </div>
            </>
          )}
        </div>
      </AppSheet>
    </Screen>
  );
}

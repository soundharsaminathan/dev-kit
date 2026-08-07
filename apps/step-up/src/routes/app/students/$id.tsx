import { Avatar, AvatarFallback, AvatarImage } from "@dev-ui/components/avatar";
import { Badge } from "@dev-ui/components/badge";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemLabel,
} from "@dev-ui/components/menu";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import type { ChatConversation } from "@/modules/chat/types";
import { TemporaryCredentialsPanel } from "@/modules/members/temporary-credentials-panel";
import {
  parseDiscountInput,
  printInvoice,
} from "@/modules/payments/print-invoice";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock, SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type PaymentMethod = "CASH" | "UPI_MANUAL";

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
  };
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
    status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
    paymentMethod?: "CASH" | "UPI_MANUAL" | "RAZORPAY" | null;
    paidAt?: string | null;
  }>;
  parents: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
  }>;
};

type StudioMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SheetKind =
  | "edit"
  | "mark-paid"
  | "link-parent"
  | "delete"
  | "toggle-active"
  | "reset-password"
  | null;

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
    default:
      return "neutral" as const;
  }
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
  const [markPaidInvoiceId, setMarkPaidInvoiceId] = useState<string | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [referralDiscount, setReferralDiscount] = useState("");
  const [studioDiscount, setStudioDiscount] = useState("");
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [resetCredentials, setResetCredentials] =
    useState<TemporaryCredentials | null>(null);

  const query = useQuery({
    queryKey: ["student-profile", studioId, id],
    queryFn: () =>
      api.get<StudentStudioProfile>(`/users/studio/${studioId}/students/${id}`),
  });

  const membersQuery = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    enabled: sheet === "link-parent",
  });

  async function invalidateStudent() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["student-profile", studioId, id],
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
        queryKey: ["batches", studioId],
      }),
    ]);
  }

  function closeSheet() {
    setSheet(null);
    setMarkPaidInvoiceId(null);
    setPaymentMethod(null);
    setReferralDiscount("");
    setStudioDiscount("");
    setParentUserId(null);
    setResetCredentials(null);
  }

  function openEdit() {
    const student = query.data?.student;
    if (!student) return;
    setEditName(student.name);
    setEditPhone(student.phone ?? "");
    setSheet("edit");
  }

  function openMarkPaid(invoiceId: string) {
    setMarkPaidInvoiceId(invoiceId);
    setPaymentMethod(null);
    setReferralDiscount("");
    setStudioDiscount("");
    setSheet("mark-paid");
  }

  function openLinkParent() {
    setParentUserId(null);
    setSheet("link-parent");
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
    onError: (error) => {
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
    onError: (error, variables) => {
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
    onError: (error) => {
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

  const markPaid = useMutation({
    mutationFn: (payload: {
      invoiceId: string;
      paymentMethod: PaymentMethod;
      referralDiscount: number;
      studioDiscount: number;
    }) =>
      api.patch(`/billing/${payload.invoiceId}/paid`, {
        paymentMethod: payload.paymentMethod,
        referralDiscount: payload.referralDiscount,
        studioDiscount: payload.studioDiscount,
      }),
    onSuccess: async () => {
      await invalidateStudent();
      closeSheet();
      toast({
        title: "Invoice marked paid",
        description: "Payment recorded. Receipt emailed to the student.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t mark invoice paid",
        description:
          error instanceof Error
            ? error.message
            : "Could not mark invoice paid.",
        variant: "error",
      });
    },
  });

  const linkParent = useMutation({
    mutationFn: (parentId: string) =>
      api.post("/users/parent-child", {
        parentUserId: parentId,
        childUserId: id,
      }),
    onSuccess: async () => {
      await invalidateStudent();
      closeSheet();
      toast({
        title: "Parent linked",
        description: "The parent account is now connected to this student.",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t link parent",
        description:
          error instanceof Error ? error.message : "Could not link parent.",
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
    onError: (error) => {
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
  const parentCandidates = useMemo(() => {
    const linked = new Set((profile?.parents ?? []).map((p) => p.id));
    return (membersQuery.data ?? []).filter(
      (member) =>
        member.role === "PARENT" && member.id !== id && !linked.has(member.id),
    );
  }, [membersQuery.data, profile?.parents, id]);

  const markPaidTarget =
    profile?.invoices.find((invoice) => invoice.id === markPaidInvoiceId) ??
    null;

  const actionError =
    deleteStudent.error ??
    updateStudent.error ??
    resetPassword.error ??
    markPaid.error ??
    linkParent.error ??
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
    if (actionId === "link-parent") {
      openLinkParent();
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

  return (
    <Screen
      title={profile?.student.name ?? "Student"}
      subtitle="Enrollment, billing, and attendance."
      showBack
      backTo="/app/students"
      actions={
        profile ? (
          <div className={staff.rowActions}>
            <Menu>
              <TouchButton
                size="sm"
                variant="quiet"
                aria-label="Student actions"
                data-testid="student-actions"
              >
                <Icon name="more-horizontal" />
                Actions
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
                <MenuItem id="link-parent" textValue="Link parent">
                  <MenuItemLabel>Link parent</MenuItemLabel>
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
        ) : null
      }
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
          <div className={staff.section}>
            <SkeletonBlock height="5rem" radius="var(--radius-2xl)" />
            <div className={staff.metrics}>
              <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
              <SkeletonBlock height="5.5rem" radius="var(--radius-2xl)" />
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
          <div className={staff.section}>
            <div className={staff.softPanel}>
              <div className={staff.rowWithAvatar}>
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
                <div className={staff.rowBody}>
                  <div className={staff.attentionTop}>
                    <span className={staff.rowTitle}>
                      {profile.student.name}
                    </span>
                    <Badge
                      appearance="subtle"
                      variant={profile.student.active ? "success" : "neutral"}
                    >
                      {profile.student.active ? "Student" : "Inactive"}
                    </Badge>
                  </div>
                  <p className={staff.rowMeta}>{profile.student.email}</p>
                  {profile.student.phone ? (
                    <p className={staff.rowMeta}>{profile.student.phone}</p>
                  ) : (
                    <p className={staff.rowMeta}>No phone on file</p>
                  )}
                  {profile.student.styles.length > 0 ? (
                    <p className={staff.rowMeta}>
                      {profile.student.styles.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className={staff.rowActions}>
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

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Attendance</h2>
              <div className={staff.metrics}>
                <div className={staff.metricCard}>
                  <span className={staff.metricLabel}>Present</span>
                  <span className={staff.metricValue}>
                    {profile.attendance.present}
                  </span>
                </div>
                <div className={staff.metricCard}>
                  <span className={staff.metricLabel}>Absent</span>
                  <span className={staff.metricValue}>
                    {profile.attendance.absent}
                  </span>
                </div>
              </div>
              {profile.attendance.total === 0 ? (
                <p className={staff.panelDesc}>
                  No attendance records yet for this student.
                </p>
              ) : null}
            </section>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Batches</h2>
              {profile.batches.length === 0 ? (
                <EmptyState
                  icon={ENTITY_ICONS.batch}
                  title="No batches"
                  description="This student is not enrolled in any batches yet."
                />
              ) : (
                <div className={staff.list}>
                  {profile.batches.map((batch) => (
                    <PressableCard
                      key={batch.id}
                      onClick={() =>
                        void navigate({
                          to: "/app/batches/$id",
                          params: { id: batch.id },
                        })
                      }
                    >
                      <div className={staff.rowCard}>
                        <div className={staff.attentionTop}>
                          <span className={staff.rowTitle}>{batch.name}</span>
                          <Badge
                            variant={
                              batch.enrollmentStatus === "ENDED"
                                ? "neutral"
                                : batch.active
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {batch.enrollmentStatus === "ENDED"
                              ? "Unenrolled"
                              : batch.active
                                ? "Active"
                                : "Inactive"}
                          </Badge>
                        </div>
                        <p className={staff.rowMeta}>
                          {batch.category === "KIDS" ? "Kids" : "Adults"}
                        </p>
                      </div>
                    </PressableCard>
                  ))}
                </div>
              )}
            </section>

            <section className={staff.section}>
              <div className={staff.attentionTop}>
                <h2 className={staff.sectionTitle}>Subscriptions</h2>
              </div>
              {profile.memberships.length === 0 ? (
                <EmptyState
                  title="No subscriptions"
                  description="Enroll this student in a batch with a linked plan to start billing."
                />
              ) : (
                <div className={staff.list}>
                  {profile.memberships.map((membership) => (
                    <div key={membership.id} className={staff.attentionCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.attentionTitle}>
                          {membership.subscription.name}
                        </span>
                        <Badge
                          variant={
                            membership.status === "ACTIVE"
                              ? "success"
                              : membership.status === "DUE"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {membershipStatusLabel(membership.status)}
                        </Badge>
                      </div>
                      <p className={staff.attentionMeta}>
                        {formatDate(membership.periodStart)} –{" "}
                        {formatDate(membership.periodEnd)}
                      </p>
                      <p className={staff.attentionMeta}>
                        {formatInr(Number(membership.subscription.price))}
                        {membership.subscription.billingCadence === "QUARTERLY"
                          ? "/qtr"
                          : "/mo"}
                      </p>
                      {membership.status === "DUE" ||
                      membership.status === "EXPIRED" ? (
                        <p className={staff.attentionMeta}>
                          Collect payment from Invoices when a renewal invoice
                          is due.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={staff.section}>
              <h2 className={staff.sectionTitle}>Invoices</h2>
              {profile.invoices.length === 0 ? (
                <EmptyState
                  title="No invoices"
                  description="Invoices will appear here once billing starts."
                />
              ) : (
                <div className={staff.list}>
                  {profile.invoices.map((invoice) => (
                    <div key={invoice.id} className={staff.attentionCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.attentionTitle}>
                          {formatInr(invoice.amount)}
                        </span>
                        <Badge variant={invoiceStatusVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      {invoice.paidAt ? (
                        <p className={staff.attentionMeta}>
                          Paid {formatDate(invoice.paidAt)}
                          {invoice.paymentMethod
                            ? ` · ${invoice.paymentMethod.replace("_", " ")}`
                            : ""}
                        </p>
                      ) : (
                        <p className={staff.attentionMeta}>Not paid yet</p>
                      )}
                      {invoice.status !== "PAID" ? (
                        <div className={staff.rowActions}>
                          <TouchButton
                            size="sm"
                            variant="primary"
                            data-testid={`mark-paid-${invoice.id}`}
                            onClick={() => openMarkPaid(invoice.id)}
                          >
                            Mark paid
                          </TouchButton>
                        </div>
                      ) : (
                        <div className={staff.rowActions}>
                          <TouchButton
                            size="sm"
                            variant="default"
                            data-testid={`print-invoice-${invoice.id}`}
                            onClick={() => {
                              printInvoice({
                                id: invoice.id,
                                amount: invoice.amount,
                                referralDiscount: invoice.referralDiscount,
                                studioDiscount: invoice.studioDiscount,
                                status: invoice.status,
                                paymentMethod: invoice.paymentMethod,
                                paidAt: invoice.paidAt,
                                studentName: profile.student.name,
                              });
                            }}
                          >
                            Print invoice
                          </TouchButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={staff.section}>
              <div className={staff.attentionTop}>
                <h2 className={staff.sectionTitle}>Parents</h2>
                <TouchButton
                  size="sm"
                  variant="default"
                  data-testid="link-parent"
                  onClick={openLinkParent}
                >
                  Link parent
                </TouchButton>
              </div>
              {profile.parents.length === 0 ? (
                <EmptyState
                  title="No linked parents"
                  description="Link a parent account so they can manage this student."
                  action={
                    <TouchButton variant="primary" onClick={openLinkParent}>
                      Link parent
                    </TouchButton>
                  }
                />
              ) : (
                <div className={staff.list}>
                  {profile.parents.map((parent) => (
                    <div key={parent.id} className={staff.attentionCard}>
                      <div className={staff.attentionTop}>
                        <span className={staff.attentionTitle}>
                          {parent.name}
                        </span>
                        <Badge appearance="subtle">Parent</Badge>
                      </div>
                      <p className={staff.attentionMeta}>{parent.email}</p>
                      {parent.phone ? (
                        <p className={staff.attentionMeta}>{parent.phone}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </PullToRefresh>

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
                })
              }
            >
              Save
            </TouchButton>
          </div>
        </div>
      </AppBottomSheet>

      <AppSheet
        isOpen={sheet === "mark-paid"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title={
          markPaidTarget
            ? `Mark paid · ${profile?.student.name ?? "Invoice"}`
            : "Mark paid"
        }
      >
        {markPaidTarget ? (
          <div className={staff.sheetStack}>
            <p className={staff.rowMeta}>
              {formatInr(markPaidTarget.amount)} · {markPaidTarget.status}
            </p>
            <FormInput
              label="Referral discount"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              data-testid="referral-discount"
              value={referralDiscount}
              onChange={setReferralDiscount}
              placeholder="0"
            />
            <FormInput
              label="Studio discount"
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              data-testid="studio-discount"
              value={studioDiscount}
              onChange={setStudioDiscount}
              placeholder="0"
            />
            <p className={staff.rowMeta}>
              {(() => {
                const referral = parseDiscountInput(referralDiscount);
                const studio = parseDiscountInput(studioDiscount);
                const net =
                  Number.isNaN(referral) || Number.isNaN(studio)
                    ? null
                    : Math.max(
                        0,
                        Math.round(
                          (markPaidTarget.amount - referral - studio) * 100,
                        ) / 100,
                      );
                if (paymentMethod && net != null) {
                  return `Confirm recording ${formatInr(net)} as ${
                    paymentMethod === "CASH" ? "cash" : "UPI"
                  } paid. This cannot be undone from here.`;
                }
                if (net != null && net !== markPaidTarget.amount) {
                  return `Net after discounts: ${formatInr(net)}. Choose how payment was received, then confirm.`;
                }
                return "Optional discounts reduce the amount collected. Choose how payment was received, then confirm.";
              })()}
            </p>
            {markPaid.isError ? (
              <ErrorState
                description={
                  markPaid.error instanceof Error
                    ? markPaid.error.message
                    : "Could not mark invoice paid."
                }
              />
            ) : null}
            <div className={staff.sheetActions}>
              <TouchButton
                variant={paymentMethod === "CASH" ? "primary" : "default"}
                fullWidth
                isDisabled={markPaid.isPending}
                onClick={() => setPaymentMethod("CASH")}
              >
                Cash
              </TouchButton>
              <TouchButton
                variant={paymentMethod === "UPI_MANUAL" ? "primary" : "default"}
                fullWidth
                isDisabled={markPaid.isPending}
                onClick={() => setPaymentMethod("UPI_MANUAL")}
              >
                UPI
              </TouchButton>
              <TouchButton
                variant="primary"
                fullWidth
                isDisabled={!paymentMethod}
                isPending={markPaid.isPending}
                data-testid="confirm-mark-paid"
                onClick={() => {
                  if (!paymentMethod) return;
                  const referral = parseDiscountInput(referralDiscount);
                  const studio = parseDiscountInput(studioDiscount);
                  if (Number.isNaN(referral) || Number.isNaN(studio)) {
                    toast({
                      title: "Invalid discount",
                      description:
                        "Enter a valid amount of 0 or more for each discount.",
                      variant: "error",
                    });
                    return;
                  }
                  markPaid.mutate({
                    invoiceId: markPaidTarget.id,
                    paymentMethod,
                    referralDiscount: referral,
                    studioDiscount: studio,
                  });
                }}
              >
                Confirm mark as paid
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppSheet>

      <AppBottomSheet
        isOpen={sheet === "link-parent"}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        title="Link parent"
        size="tall"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Choose a parent account in this studio to link with{" "}
            {profile?.student.name}.
          </p>
          {membersQuery.isLoading ? <SkeletonCardList count={3} /> : null}
          {membersQuery.isError ? (
            <ErrorState
              description={
                membersQuery.error instanceof Error
                  ? membersQuery.error.message
                  : "Could not load studio members."
              }
            />
          ) : null}
          {parentCandidates.length === 0 && !membersQuery.isLoading ? (
            <EmptyState
              title="No parents available"
              description="Create a parent account in this studio first, or all parents are already linked."
            />
          ) : null}
          <div className={staff.sheetActions}>
            {parentCandidates.map((parent) => (
              <TouchButton
                key={parent.id}
                variant={parentUserId === parent.id ? "primary" : "default"}
                fullWidth
                isDisabled={linkParent.isPending}
                data-testid={`pick-parent-${parent.id}`}
                onClick={() => setParentUserId(parent.id)}
              >
                {parent.name} · {parent.email}
              </TouchButton>
            ))}
            {linkParent.isError ? (
              <ErrorState
                description={
                  linkParent.error instanceof Error
                    ? linkParent.error.message
                    : "Could not link parent."
                }
              />
            ) : null}
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!parentUserId}
              isPending={linkParent.isPending}
              data-testid="confirm-link-parent"
              onClick={() => {
                if (!parentUserId) return;
                linkParent.mutate(parentUserId);
              }}
            >
              Confirm link
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

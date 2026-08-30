import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { rememberAdminStudioId } from "@/modules/admin/use-admin-studio";
import { AppSheet } from "@/modules/ui/app-sheet";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudioListItem = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  memberCount: number;
  activeStudents: number;
  trainers: number;
  sessionsThisMonth: number;
  owner: { id: string; email: string; name: string };
};

type DeleteStudioResult = {
  deleted: true;
  id: string;
  name: string;
};

export const Route = createFileRoute("/admin/")({
  component: AdminStudiosPage,
});

function AdminStudiosPage() {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AdminStudiosPage");
  const [studioToDelete, setStudioToDelete] = useState<StudioListItem | null>(
    null,
  );

  const studiosQuery = useQuery({
    queryKey: ["admin", "studios"],
    queryFn: () => api.get<StudioListItem[]>("/studios"),
  });

  const deleteMutation = useMutation({
    mutationFn: (studioId: string) =>
      api.delete<DeleteStudioResult>(`/studios/${studioId}`),
    onSuccess: (result) => {
      setStudioToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
      toast({
        title: "Studio deleted",
        description: `${result.name} and its members were removed.`,
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t delete studio",
        description:
          error instanceof Error ? error.message : "Could not delete studio.",
        variant: "error",
      });
    },
  });

  return (
    <Screen
      title="Studios"
      subtitle="Provision tenant studios. Owners manage their own teams."
    >
      <div className={staff.rowActions}>
        <TouchButton
          variant="primary"
          data-testid="create-studio"
          onClick={() => void navigate({ to: "/admin/studios/new" })}
        >
          Create studio
        </TouchButton>
      </div>

      <section className={staff.section}>
        <h2 className={staff.sectionTitle}>All studios</h2>
        {studiosQuery.isLoading ? <SkeletonBlock height="8rem" /> : null}
        {studiosQuery.isError ? (
          <ErrorState
            description={
              studiosQuery.error instanceof Error
                ? studiosQuery.error.message
                : "Could not load studios."
            }
          />
        ) : null}
        {studiosQuery.data?.length === 0 ? (
          <EmptyState
            title="No studios yet"
            description="Create the first tenant studio."
          />
        ) : null}
        {studiosQuery.data && studiosQuery.data.length > 0 ? (
          <ul className={staff.list}>
            {studiosQuery.data.map((studio) => (
              <li key={studio.id} className={staff.attentionCard}>
                <Link
                  to="/admin/studios/$id"
                  params={{ id: studio.id }}
                  className={staff.attentionTitle}
                  data-testid={`edit-studio-${studio.id}`}
                  onClick={() => rememberAdminStudioId(studio.id)}
                >
                  {studio.name}
                </Link>
                <p className={staff.attentionMeta}>
                  Owner {studio.owner.name} · {studio.owner.email}
                </p>
                <p className={staff.attentionMeta}>
                  {studio.activeStudents} active students · {studio.trainers}{" "}
                  trainers · {studio.sessionsThisMonth} sessions this month
                </p>
                <p className={staff.attentionMeta}>
                  {studio.memberCount} members · {studio.id}
                </p>
                <div className={staff.rowActions}>
                  <TouchButton
                    variant="danger"
                    size="sm"
                    data-testid={`delete-studio-${studio.id}`}
                    onClick={() => setStudioToDelete(studio)}
                  >
                    Delete
                  </TouchButton>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <AppSheet
        isOpen={studioToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setStudioToDelete(null);
          }
        }}
        title="Delete studio"
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Delete “{studioToDelete?.name}”? This removes the studio, its
            batches, bookings, and all member accounts. This cannot be undone.
          </p>
          {deleteMutation.isError ? (
            <ErrorState
              description={
                deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "Could not delete studio."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={deleteMutation.isPending}
              onClick={() => setStudioToDelete(null)}
            >
              Cancel
            </TouchButton>
            <TouchButton
              variant="danger"
              fullWidth
              isPending={deleteMutation.isPending}
              data-testid="confirm-delete-studio"
              onClick={() => {
                if (!studioToDelete) return;
                deleteMutation.mutate(studioToDelete.id);
              }}
            >
              Delete studio
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </Screen>
  );
}

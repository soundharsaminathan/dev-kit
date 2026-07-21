import { Badge } from "@dev-ui/components/badge";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import { BloomMenu } from "@/modules/ui/bloom-menu";
import { PressableCard } from "@/modules/ui/pressable-card";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudioMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
};

const CREATE_ITEMS = [
  { id: "single", label: "Single add", icon: ENTITY_ICONS.student },
  { id: "bulk", label: "Bulk import", icon: "upload" as const },
];

export const Route = createFileRoute("/app/students/")({
  component: StudentsPage,
});

function StudentsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["studio-members", STUDIO_ID],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${STUDIO_ID}`),
  });

  const students = useMemo(
    () => query.data?.filter((member) => member.role === "STUDENT") ?? [],
    [query.data],
  );

  function handleCreateSelect(id: string) {
    if (id === "bulk") {
      void navigate({ to: "/app/students/import" });
      return;
    }
    void navigate({ to: "/app/students/new" });
  }

  return (
    <Screen
      title="Students"
      subtitle="Students registered at your studio."
      actions={
        <BloomMenu
          items={CREATE_ITEMS}
          triggerLabel="Add student(s)"
          panelTitle="Add student(s)"
          onSelect={handleCreateSelect}
        />
      }
    >
      <PullToRefresh onRefresh={() => query.refetch()}>
        <div className={staff.section}>
          {query.isLoading ? <SkeletonCardList count={4} /> : null}

          {query.isError ? (
            <ErrorState
              description={
                query.error instanceof Error
                  ? query.error.message
                  : "Could not load students."
              }
              action={
                <TouchButton variant="primary" onClick={() => query.refetch()}>
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {query.isFetched && students.length === 0 ? (
            <EmptyState
              icon={ENTITY_ICONS.student}
              title="No students yet"
              description="Add a student to get started."
              action={
                <TouchButton variant="primary">
                  <Link to="/app/students/new">Add student</Link>
                </TouchButton>
              }
            />
          ) : null}

          {students.length > 0 ? (
            <div className={staff.list}>
              {students.map((student) => (
                <PressableCard
                  key={student.id}
                  onClick={() =>
                    void navigate({
                      to: "/app/students/$id",
                      params: { id: student.id },
                    })
                  }
                >
                  <div className={staff.rowCard}>
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>{student.name}</span>
                      <Badge appearance="subtle">{student.role}</Badge>
                    </div>
                    <p className={staff.rowMeta}>{student.email}</p>
                    {student.phone ? (
                      <p className={staff.rowMeta}>{student.phone}</p>
                    ) : null}
                  </div>
                </PressableCard>
              ))}
            </div>
          ) : null}
        </div>
      </PullToRefresh>
    </Screen>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { ENTITY_ICONS } from "@/lib/entity-icons";
import {
  StudentSearchCombobox,
  type StudioStudent,
} from "@/modules/students/student-search-combobox";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

type BookingType = "TRIAL" | "OPEN_SEAT" | "PRIVATE";

type Booking = {
  id: string;
};

export const Route = createFileRoute("/app/bookings/new")({
  component: NewBookingPage,
});

function NewBookingPage() {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [type, setType] = useState<BookingType>("TRIAL");

  const hasAnyStudentsQuery = useQuery({
    queryKey: ["studio-students-search", STUDIO_ID, ""],
    queryFn: () =>
      api.get<StudioStudent[]>(`/users/studio/${STUDIO_ID}/students`),
  });

  const createBooking = useMutation({
    mutationFn: () =>
      api.post<Booking>("/bookings", {
        studioId: STUDIO_ID,
        studentId,
        type,
        notes: "Created from staff dashboard",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["bookings", "studio", STUDIO_ID],
      });
      await navigate({ to: "/app/bookings" });
    },
  });

  const hasStudents = (hasAnyStudentsQuery.data?.length ?? 0) > 0;
  const isBootstrapping =
    hasAnyStudentsQuery.isLoading ||
    (hasAnyStudentsQuery.isFetching && !hasAnyStudentsQuery.data);

  return (
    <>
      <Screen
        title="New booking"
        subtitle="Book on behalf of a student."
        showBack
        backTo="/app/bookings"
        paddedCta
      >
        {isBootstrapping ? (
          <div className={staff.sheetStack}>
            <SkeletonBlock height="3rem" />
            <SkeletonBlock height="3rem" />
          </div>
        ) : null}

        {hasAnyStudentsQuery.isError ? (
          <ErrorState
            description={
              hasAnyStudentsQuery.error instanceof Error
                ? hasAnyStudentsQuery.error.message
                : "Could not load students."
            }
            action={
              <TouchButton
                variant="primary"
                onClick={() => hasAnyStudentsQuery.refetch()}
              >
                Try again
              </TouchButton>
            }
          />
        ) : null}

        {hasAnyStudentsQuery.isFetched && !hasStudents ? (
          <EmptyState
            icon={ENTITY_ICONS.student}
            title="No students"
            description="Add students to the studio before creating a booking."
          />
        ) : null}

        {hasStudents ? (
          <div className={staff.softPanel}>
            <StudentSearchCombobox
              label="Student"
              selectedKey={studentId}
              onSelectionChange={(student) => setStudentId(student?.id ?? null)}
            />
            <Select
              label="Type"
              selectedKey={type}
              onSelectionChange={(key) => setType(key as BookingType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="TRIAL">Trial</SelectItem>
                <SelectItem id="OPEN_SEAT">Open seat</SelectItem>
                <SelectItem id="PRIVATE">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </Screen>

      {hasStudents ? (
        <StickyCtaBar
          secondary={
            <TouchButton
              variant="quiet"
              fullWidth
              onClick={() => void navigate({ to: "/app/bookings" })}
            >
              Cancel
            </TouchButton>
          }
        >
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!studentId}
            isPending={createBooking.isPending}
            onClick={() => createBooking.mutate()}
          >
            Create booking
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}

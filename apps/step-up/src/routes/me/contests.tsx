import { Badge } from "@dev-ui/components/badge";
import { Checkbox } from "@dev-ui/components/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useAuth } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import type { Contest, ContestCategory } from "@/modules/contests/types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { PullToRefresh } from "@/modules/ui/pull-to-refresh";
import { Screen } from "@/modules/ui/screen";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState, SuccessState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import styles from "./contests.module.scss";

type StudioMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type UserDetail = {
  id: string;
  role: string;
  parentLinks?: Array<{
    child: { id: string; name: string; email: string; role: string };
  }>;
};

export const Route = createFileRoute("/me/contests")({
  component: MeContestsPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MeContestsPage() {
  const api = useApi();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [teamName, setTeamName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [justRegistered, setJustRegistered] = useState(false);

  const contestsQuery = useQuery({
    queryKey: ["contests", STUDIO_ID],
    queryFn: () => api.get<Contest[]>(`/contests/studio/${STUDIO_ID}`),
  });

  const membersQuery = useQuery({
    queryKey: ["users", STUDIO_ID],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${STUDIO_ID}`),
    enabled: user?.role === "STUDENT",
  });

  const meQuery = useQuery({
    queryKey: ["users", user?.id],
    queryFn: () => api.get<UserDetail>(`/users/${user!.id}`),
    enabled: user?.role === "PARENT" && Boolean(user?.id),
  });

  const openContests = useMemo(
    () =>
      (contestsQuery.data ?? []).filter((contest) => contest.status === "OPEN"),
    [contestsQuery.data],
  );

  const selectedCategory = useMemo(() => {
    for (const contest of openContests) {
      const category = contest.categories.find(
        (item) => item.id === selectedCategoryId,
      );
      if (category) {
        return { contest, category };
      }
    }
    return null;
  }, [openContests, selectedCategoryId]);

  const eligibleStudents = useMemo(() => {
    if (!user) {
      return [];
    }
    if (user.role === "STUDENT") {
      return [{ id: user.id, name: user.name, email: user.email }];
    }
    if (user.role === "PARENT") {
      return (meQuery.data?.parentLinks ?? []).map((link) => ({
        id: link.child.id,
        name: link.child.name,
        email: link.child.email,
      }));
    }
    return [];
  }, [user, meQuery.data]);

  const teammateOptions = useMemo(() => {
    if (user?.role !== "STUDENT" || !selectedCategory) {
      return [];
    }
    if (selectedCategory.category.entryType !== "GROUP") {
      return [];
    }
    return (membersQuery.data ?? []).filter(
      (member) => member.role === "STUDENT" && member.id !== user.id,
    );
  }, [user, selectedCategory, membersQuery.data]);

  const register = useMutation({
    mutationFn: () => {
      if (!selectedCategory) {
        throw new Error("Select a category");
      }
      const studentIds =
        selectedCategory.category.entryType === "INDIVIDUAL"
          ? selectedStudentIds.slice(0, 1)
          : user?.role === "STUDENT"
            ? [user.id, ...selectedStudentIds.filter((id) => id !== user.id)]
            : selectedStudentIds;

      return api.post(
        `/contests/categories/${selectedCategory.category.id}/entries`,
        {
          studentIds,
          teamName:
            selectedCategory.category.entryType === "GROUP"
              ? teamName.trim()
              : undefined,
        },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contests", STUDIO_ID] });
      setTeamName("");
      setSelectedStudentIds([]);
      setSelectedCategoryId(null);
      setJustRegistered(true);
    },
  });

  function selectCategory(category: ContestCategory) {
    setSelectedCategoryId(category.id);
    setTeamName("");
    setJustRegistered(false);
    register.reset();
    if (user?.role === "STUDENT") {
      setSelectedStudentIds([user.id]);
    } else {
      const onlyChild =
        eligibleStudents.length === 1 ? eligibleStudents[0] : undefined;
      setSelectedStudentIds(onlyChild ? [onlyChild.id] : []);
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  const sheetOpen = Boolean(selectedCategory);

  return (
    <Screen
      title="Contests"
      subtitle="Browse open contests and register."
      showBack
      backTo="/me/profile"
    >
      <PullToRefresh onRefresh={() => contestsQuery.refetch()}>
        <div className={styles.root}>
          {justRegistered ? (
            <SuccessState
              title="Registered successfully"
              description="Your contest entry was submitted."
              action={
                <TouchButton
                  variant="quiet"
                  onClick={() => setJustRegistered(false)}
                >
                  Dismiss
                </TouchButton>
              }
            />
          ) : null}

          {contestsQuery.isLoading ? <SkeletonCardList count={2} /> : null}

          {contestsQuery.isError ? (
            <ErrorState
              description={
                contestsQuery.error instanceof Error
                  ? contestsQuery.error.message
                  : "Could not load contests."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => contestsQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}

          {!contestsQuery.isLoading &&
          !contestsQuery.isError &&
          openContests.length === 0 ? (
            <EmptyState
              title="No open contests"
              description="Check back when the studio opens registration."
            />
          ) : null}

          {openContests.map((contest) => (
            <article key={contest.id} className={styles.contest}>
              <div>
                <h2 className={styles.contestTitle}>{contest.title}</h2>
                <p className={styles.contestMeta}>
                  {formatDate(contest.startsAt)} – {formatDate(contest.endsAt)}
                  {contest.certificationEnabled
                    ? " · Certificates available"
                    : ""}
                </p>
              </div>
              {contest.description ? (
                <p className={styles.contestDesc}>{contest.description}</p>
              ) : null}
              <div className={styles.categories}>
                {contest.categories.map((category) => (
                  <div key={category.id} className={styles.categoryRow}>
                    <div className={styles.categoryTop}>
                      <span className={styles.categoryName}>
                        {category.name}
                      </span>
                      <Badge>
                        {category.entryType === "GROUP" ? "Group" : "Solo"}
                      </Badge>
                    </div>
                    <span className={styles.categoryMeta}>
                      {category.danceStyle} · ages {category.ageMin}–
                      {category.ageMax}
                      {category.judges.length
                        ? ` · Judges: ${category.judges
                            .map((judge) => judge.name)
                            .join(", ")}`
                        : ""}
                    </span>
                    <TouchButton
                      variant={
                        selectedCategoryId === category.id ? "primary" : "quiet"
                      }
                      fullWidth
                      onClick={() => selectCategory(category)}
                    >
                      {selectedCategoryId === category.id
                        ? "Selected"
                        : "Register"}
                    </TouchButton>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </PullToRefresh>

      <AppSheet
        isOpen={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategoryId(null);
            register.reset();
          }
        }}
        title={
          selectedCategory
            ? `Register · ${selectedCategory.category.name}`
            : "Register"
        }
      >
        {selectedCategory ? (
          <div className={styles.registerForm}>
            <p className={styles.categoryMeta}>
              {selectedCategory.contest.title} ·{" "}
              {selectedCategory.category.entryType === "GROUP"
                ? "Build a group entry"
                : "Individual entry"}
            </p>

            {selectedCategory.category.entryType === "INDIVIDUAL" ? (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Participant</span>
                <div className={styles.checkList}>
                  {eligibleStudents.map((student) => (
                    <div key={student.id} className={styles.checkItem}>
                      <Checkbox
                        isSelected={selectedStudentIds.includes(student.id)}
                        onChange={() => setSelectedStudentIds([student.id])}
                      >
                        {student.name}
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <FormInput
                  label="Team name"
                  value={teamName}
                  onChange={setTeamName}
                  placeholder="Fireflies"
                />
                {user?.role === "STUDENT" ? (
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      Teammates (you are included)
                    </span>
                    <div className={styles.checkList}>
                      {teammateOptions.map((student) => (
                        <div key={student.id} className={styles.checkItem}>
                          <Checkbox
                            isSelected={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                          >
                            {student.name}
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>
                      Children in this group
                    </span>
                    <div className={styles.checkList}>
                      {eligibleStudents.map((student) => (
                        <div key={student.id} className={styles.checkItem}>
                          <Checkbox
                            isSelected={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                          >
                            {student.name}
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <TouchButton
              variant="primary"
              fullWidth
              isPending={register.isPending}
              isDisabled={
                selectedCategory.category.entryType === "INDIVIDUAL"
                  ? selectedStudentIds.length !== 1
                  : !teamName.trim() ||
                    (user?.role === "STUDENT"
                      ? selectedStudentIds.filter((id) => id !== user.id)
                          .length < 1
                      : selectedStudentIds.length < 2)
              }
              onClick={() => register.mutate()}
            >
              Submit entry
            </TouchButton>

            {register.isError ? (
              <p className={styles.alert} role="alert">
                {(register.error as Error).message}
              </p>
            ) : null}
          </div>
        ) : null}
      </AppSheet>
    </Screen>
  );
}

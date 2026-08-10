import { Checkbox } from "@dev-ui/components/checkbox";
import { Tag, TagGroup, TagList } from "@dev-ui/components/tag-group";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Key, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { FormInput } from "@/modules/ui/form-input";
import { SkeletonCardList } from "@/modules/ui/skeleton-block";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import type { StudioStudent } from "./student-search-combobox";
import styles from "./student-search-multiselect.module.scss";

type StudentSearchPage = {
  items: StudioStudent[];
  nextCursor: string | null;
};

type StudentSearchMultiselectProps = {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  excludeIds?: Iterable<string>;
  includeParents?: boolean;
  isDisabled?: boolean;
  enabled?: boolean;
  label?: string;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function StudentSearchMultiselect({
  selectedIds,
  onSelectedIdsChange,
  excludeIds,
  includeParents = false,
  isDisabled,
  enabled = true,
  label = "Search students",
  placeholder = "Name or email",
  emptyTitle = "No students found",
  emptyDescription = "Try a different name or email.",
  pageSize = 20,
}: StudentSearchMultiselectProps) {
  const api = useApi();
  const studioId = useStudioId();
  const [search, setSearch] = useState("");
  const [selectedById, setSelectedById] = useState<
    Record<string, StudioStudent>
  >({});
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  const studentsQuery = useInfiniteQuery({
    queryKey: [
      "studio-students-search",
      studioId,
      debouncedSearch,
      includeParents,
      pageSize,
      "paged",
    ],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", String(pageSize));
      if (includeParents) params.set("includeParents", "true");
      const qs = params.toString();
      return api.get<StudentSearchPage>(
        `/users/studio/${studioId}/students?${qs}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    placeholderData: (previous) => previous,
  });

  const students = useMemo(() => {
    const seen = new Set<string>();
    const rows: StudioStudent[] = [];
    for (const page of studentsQuery.data?.pages ?? []) {
      for (const student of page.items) {
        if (excluded.has(student.id) || seen.has(student.id)) continue;
        seen.add(student.id);
        rows.push(student);
      }
    }
    return rows;
  }, [studentsQuery.data?.pages, excluded]);

  useEffect(() => {
    if (students.length === 0) return;
    setSelectedById((current) => {
      let changed = false;
      const next = { ...current };
      for (const student of students) {
        if (selectedIds.includes(student.id) && !next[student.id]) {
          next[student.id] = student;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [students, selectedIds]);

  const selectedStudents = useMemo(
    () =>
      selectedIds
        .map((id) => selectedById[id])
        .filter((student): student is StudioStudent => Boolean(student)),
    [selectedIds, selectedById],
  );

  function toggleStudent(student: StudioStudent) {
    const selected = selectedIds.includes(student.id);
    if (selected) {
      onSelectedIdsChange(selectedIds.filter((id) => id !== student.id));
      setSelectedById((current) => {
        const { [student.id]: _removed, ...rest } = current;
        return rest;
      });
      return;
    }
    onSelectedIdsChange([...selectedIds, student.id]);
    setSelectedById((current) => ({ ...current, [student.id]: student }));
  }

  function removeSelected(keys: Set<Key>) {
    const removeIds = new Set([...keys].map(String));
    onSelectedIdsChange(selectedIds.filter((id) => !removeIds.has(id)));
    setSelectedById((current) => {
      const next = { ...current };
      for (const id of removeIds) {
        delete next[id];
      }
      return next;
    });
  }

  return (
    <div className={styles.root}>
      <FormInput
        label={label}
        value={search}
        onChange={setSearch}
        placeholder={placeholder}
        {...(isDisabled != null ? { isDisabled } : {})}
        data-testid="family-search"
      />

      {selectedStudents.length > 0 ? (
        <TagGroup
          aria-label="Selected family members"
          onRemove={removeSelected}
        >
          <TagList>
            {selectedStudents.map((student) => (
              <Tag key={student.id} id={student.id}>
                {student.name}
                {student.role === "PARENT" ? " · Parent" : ""}
              </Tag>
            ))}
          </TagList>
        </TagGroup>
      ) : null}

      {studentsQuery.isLoading ? <SkeletonCardList count={3} /> : null}
      {studentsQuery.isError ? (
        <ErrorState
          description={
            studentsQuery.error instanceof Error
              ? studentsQuery.error.message
              : "Could not load students."
          }
        />
      ) : null}

      {!studentsQuery.isLoading &&
      !studentsQuery.isError &&
      students.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={
            debouncedSearch
              ? emptyDescription
              : "Create student accounts first, or everyone is already linked."
          }
        />
      ) : null}

      {students.length > 0 ? (
        <ul className={styles.results} data-testid="family-search-results">
          {students.map((student) => {
            const selected = selectedIds.includes(student.id);
            const meta = [
              student.email,
              student.role === "PARENT" ? "Parent" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={student.id}
                className={styles.resultRow}
                data-selected={selected ? "true" : undefined}
                data-testid={`pick-family-${student.id}`}
              >
                <Checkbox
                  isSelected={selected}
                  {...(isDisabled != null ? { isDisabled } : {})}
                  onChange={() => toggleStudent(student)}
                >
                  {`${student.name} · ${meta}`}
                </Checkbox>
              </li>
            );
          })}
        </ul>
      ) : null}

      {studentsQuery.hasNextPage ? (
        <TouchButton
          variant="default"
          fullWidth
          {...(isDisabled != null ? { isDisabled } : {})}
          isPending={studentsQuery.isFetchingNextPage}
          data-testid="family-search-load-more"
          onClick={() => {
            void studentsQuery.fetchNextPage();
          }}
        >
          Load more
        </TouchButton>
      ) : null}
    </div>
  );
}

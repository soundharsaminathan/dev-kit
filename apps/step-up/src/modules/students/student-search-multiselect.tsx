import {
  CheckboxControl,
  CheckboxIndicator,
} from "@dev-ui/components/checkbox";
import { Tag, TagGroup, TagList } from "@dev-ui/components/tag-group";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type Key, useEffect, useMemo, useRef, useState } from "react";
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
  onSelectedStudentsChange?: (students: StudioStudent[]) => void;
  excludeIds?: Iterable<string>;
  includeParents?: boolean;
  maxSelected?: number;
  isDisabled?: boolean;
  enabled?: boolean;
  label?: string;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  testIdPrefix?: string;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function matchesStudentSearch(student: StudioStudent, query: string) {
  if (!query) return true;
  const haystack = [student.name, student.email, student.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function flattenStudents(
  pages: StudentSearchPage[] | undefined,
  excluded: Set<string>,
  selectedIds: Set<string>,
) {
  const seen = new Set<string>();
  const rows: StudioStudent[] = [];
  for (const page of pages ?? []) {
    for (const student of page.items) {
      if (seen.has(student.id)) continue;
      if (excluded.has(student.id) && !selectedIds.has(student.id)) continue;
      seen.add(student.id);
      rows.push(student);
    }
  }
  return rows;
}

export function StudentSearchMultiselect({
  selectedIds,
  onSelectedIdsChange,
  onSelectedStudentsChange,
  excludeIds,
  includeParents = false,
  maxSelected,
  isDisabled,
  enabled = true,
  label = "Search students",
  placeholder = "Search students",
  emptyTitle = "No students found",
  emptyDescription = "Try a different name or email.",
  pageSize = 20,
  testIdPrefix = "family",
}: StudentSearchMultiselectProps) {
  const api = useApi();
  const studioId = useStudioId();
  const [search, setSearch] = useState("");
  const [selectedById, setSelectedById] = useState<
    Record<string, StudioStudent>
  >({});
  const searchQuery = search.trim();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const atCap = maxSelected != null && selectedIds.length >= maxSelected;

  const catalogQuery = useInfiniteQuery({
    queryKey: [
      "studio-students-search",
      studioId,
      "",
      includeParents,
      pageSize,
      "paged",
    ],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", String(pageSize));
      if (includeParents) params.set("includeParents", "true");
      return api.get<StudentSearchPage>(
        `/users/studio/${studioId}/students?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    placeholderData: (previous) => previous,
  });

  const catalogComplete =
    catalogQuery.isSuccess && !catalogQuery.hasNextPage;

  const remoteSearchQuery = useInfiniteQuery({
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
      params.set("q", debouncedSearch);
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", String(pageSize));
      if (includeParents) params.set("includeParents", "true");
      return api.get<StudentSearchPage>(
        `/users/studio/${studioId}/students?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !catalogComplete && debouncedSearch.length > 0,
    placeholderData: (previous) => previous,
  });

  const useRemoteSearch = !catalogComplete && debouncedSearch.length > 0;
  const activeQuery = useRemoteSearch ? remoteSearchQuery : catalogQuery;

  const students = useMemo(() => {
    const rows = flattenStudents(
      activeQuery.data?.pages,
      excluded,
      selectedIdSet,
    );
    if (!catalogComplete) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter((student) => matchesStudentSearch(student, query));
  }, [
    activeQuery.data?.pages,
    catalogComplete,
    excluded,
    searchQuery,
    selectedIdSet,
  ]);

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

  const onSelectedStudentsChangeRef = useRef(onSelectedStudentsChange);
  onSelectedStudentsChangeRef.current = onSelectedStudentsChange;

  useEffect(() => {
    onSelectedStudentsChangeRef.current?.(selectedStudents);
  }, [selectedStudents]);

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
    if (atCap) return;
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

  const isLoading = useRemoteSearch
    ? remoteSearchQuery.isLoading ||
      (remoteSearchQuery.isFetching && !remoteSearchQuery.data)
    : catalogQuery.isLoading;
  const isError = activeQuery.isError;
  const error = activeQuery.error;
  const showLoadMore =
    !catalogComplete &&
    activeQuery.hasNextPage &&
    !(useRemoteSearch && remoteSearchQuery.isLoading);

  return (
    <div className={styles.root}>
      <FormInput
        label={label}
        value={search}
        onChange={setSearch}
        placeholder={placeholder}
        {...(isDisabled != null ? { isDisabled } : {})}
        data-testid={`${testIdPrefix}-search`}
      />

      {selectedStudents.length > 0 ? (
        <TagGroup aria-label="Selected students" onRemove={removeSelected}>
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

      {atCap && maxSelected != null ? (
        <p className={styles.hint}>
          {selectedIds.length} of {maxSelected} selected
        </p>
      ) : null}

      {isLoading ? <SkeletonCardList count={3} /> : null}
      {isError ? (
        <ErrorState
          description={
            error instanceof Error ? error.message : "Could not load students."
          }
        />
      ) : null}

      {enabled &&
      !isLoading &&
      !isError &&
      students.length === 0 &&
      selectedIds.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={
            searchQuery
              ? emptyDescription
              : "Create student accounts first, or everyone is already linked."
          }
        />
      ) : null}

      {students.length > 0 ? (
        <ul
          className={styles.results}
          data-testid={`${testIdPrefix}-search-results`}
        >
          {students.map((student) => {
            const selected = selectedIds.includes(student.id);
            const rowDisabled = Boolean(isDisabled) || (!selected && atCap);
            const meta = [
              student.email,
              student.role === "PARENT" ? "Parent" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li
                key={student.id}
                className={styles.resultItem}
                data-selected={selected ? "true" : undefined}
                data-testid={`pick-${testIdPrefix}-${student.id}`}
              >
                <CheckboxControl
                  className={styles.resultRow}
                  isSelected={selected}
                  isDisabled={rowDisabled}
                  onChange={() => toggleStudent(student)}
                >
                  <CheckboxIndicator />
                  <span className={styles.resultLabel}>
                    {`${student.name} · ${meta}`}
                  </span>
                </CheckboxControl>
              </li>
            );
          })}
        </ul>
      ) : null}

      {showLoadMore ? (
        <TouchButton
          variant="default"
          fullWidth
          {...(isDisabled != null ? { isDisabled } : {})}
          isPending={activeQuery.isFetchingNextPage}
          data-testid={`${testIdPrefix}-search-load-more`}
          onClick={() => {
            void activeQuery.fetchNextPage();
          }}
        >
          Load more
        </TouchButton>
      ) : null}
    </div>
  );
}

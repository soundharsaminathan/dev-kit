import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Icon } from "@dev-ui/icons";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatActiveDuration } from "@/lib/format-active-duration";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import styles from "./attendance-roster-table.module.scss";
import {
  type AttendanceRosterEntry,
  type AttendanceStatusFilter,
  type AttendanceStatusValue,
  attendanceSourceLabel,
  attendanceStatusLabel,
  rosterStatus,
} from "./types";

const STATUS_ORDER: Record<"PRESENT" | "ABSENT" | "UNMARKED", number> = {
  UNMARKED: 0,
  PRESENT: 1,
  ABSENT: 2,
};

const STATUS_FILTER_CHIPS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "UNMARKED", label: "Unmarked" },
  { id: "PRESENT", label: "Present" },
  { id: "ABSENT", label: "Absent" },
];

const getCoreModel = getCoreRowModel<AttendanceRosterEntry>();
const getSortedModel = getSortedRowModel<AttendanceRosterEntry>();
const getFilteredModel = getFilteredRowModel<AttendanceRosterEntry>();

type AttendanceRosterTableProps = {
  roster: AttendanceRosterEntry[];
  isBusy?: boolean | undefined;
  pendingStudentId?: string | null | undefined;
  markingDisabled?: boolean | undefined;
  onMarkOne: (studentId: string, status: AttendanceStatusValue) => void;
  onMarkSelected: (studentIds: string[], status: AttendanceStatusValue) => void;
  onMarkAllUnmarkedPresent?: (() => void) | undefined;
  unmarkedCount?: number | undefined;
};

type RosterTableMeta = {
  markingDisabled: boolean;
  actionsLocked: boolean;
  pendingStudentId: string | null;
  onMarkOne: (studentId: string, status: AttendanceStatusValue) => void;
};

function StatusBadge({
  status,
}: {
  status: AttendanceStatusValue | "UNMARKED";
}) {
  if (status === "PRESENT") {
    return <Badge variant="success">Present</Badge>;
  }
  if (status === "ABSENT") {
    return <Badge variant="danger">Absent</Badge>;
  }
  return (
    <Badge appearance="subtle" variant="warning">
      Unmarked
    </Badge>
  );
}

function SelectCheckbox({
  "aria-label": ariaLabel,
  isSelected,
  isIndeterminate = false,
  isDisabled = false,
  onChange,
}: {
  "aria-label": string;
  isSelected: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  onChange: (selected: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <label
      data-checkbox-control=""
      className={styles.selectCheck}
      data-disabled={isDisabled ? "true" : undefined}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className={styles.selectCheckInput}
        aria-label={ariaLabel}
        checked={isSelected}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={styles.selectCheckBox}
        aria-hidden
        data-selected={isSelected ? "true" : undefined}
        data-indeterminate={isIndeterminate ? "true" : undefined}
        data-disabled={isDisabled ? "true" : undefined}
      >
        {isIndeterminate ? (
          <Icon name="minus" />
        ) : isSelected ? (
          <Icon name="check" />
        ) : null}
      </span>
    </label>
  );
}

const RosterRow = memo(
  function RosterRow({
    row,
    isSelected,
    isRowPending,
    actionsLocked,
    markingDisabled,
  }: {
    row: Row<AttendanceRosterEntry>;
    isSelected: boolean;
    isRowPending: boolean;
    actionsLocked: boolean;
    markingDisabled: boolean;
  }) {
    return (
      <tr
        className={styles.tr}
        data-selected={isSelected ? "" : undefined}
        data-pending={isRowPending ? "" : undefined}
        data-actions-locked={actionsLocked ? "" : undefined}
        data-marking-disabled={markingDisabled ? "" : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className={styles.td}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    );
  },
  (prev, next) =>
    prev.row.id === next.row.id &&
    prev.row.original === next.row.original &&
    prev.isSelected === next.isSelected &&
    prev.isRowPending === next.isRowPending &&
    prev.actionsLocked === next.actionsLocked &&
    prev.markingDisabled === next.markingDisabled,
);

export function AttendanceRosterTable({
  roster,
  isBusy = false,
  pendingStudentId = null,
  markingDisabled = false,
  onMarkOne,
  onMarkSelected,
  onMarkAllUnmarkedPresent,
  unmarkedCount = 0,
}: AttendanceRosterTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: false },
  ]);
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>("all");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const actionsLocked = isBusy || markingDisabled;

  const metaRef = useRef<RosterTableMeta>({
    markingDisabled,
    actionsLocked,
    pendingStudentId,
    onMarkOne,
  });
  metaRef.current = {
    markingDisabled,
    actionsLocked,
    pendingStudentId,
    onMarkOne,
  };

  const columns = useMemo<ColumnDef<AttendanceRosterEntry>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const meta = metaRef.current;
          return (
            <SelectCheckbox
              aria-label="Select all students"
              isSelected={table.getIsAllPageRowsSelected()}
              isIndeterminate={
                table.getIsSomePageRowsSelected() &&
                !table.getIsAllPageRowsSelected()
              }
              isDisabled={meta.markingDisabled}
              onChange={(selected) => table.toggleAllPageRowsSelected(selected)}
            />
          );
        },
        cell: ({ row }) => {
          const meta = metaRef.current;
          return (
            <SelectCheckbox
              aria-label={`Select ${row.original.student.name}`}
              isSelected={row.getIsSelected()}
              isDisabled={meta.markingDisabled || !row.getCanSelect()}
              onChange={(selected) => row.toggleSelected(selected)}
            />
          );
        },
        enableSorting: false,
        size: 44,
      },
      {
        id: "name",
        accessorFn: (row) => row.student.name,
        header: "Student",
        cell: ({ row }) => {
          const activeDuration = formatActiveDuration(
            row.original.student.createdAt,
          );
          return (
            <div className={styles.studentCell}>
              <div className={styles.studentNameRow}>
                <span className={styles.studentName}>
                  {row.original.student.name}
                </span>
                {row.original.isTrial ? (
                  <Badge appearance="subtle" variant="info">
                    Trial
                  </Badge>
                ) : null}
                {row.original.monthlyUnpaid ? (
                  <Badge appearance="subtle" variant="warning">
                    Not paid
                  </Badge>
                ) : null}
              </div>
              {activeDuration ? (
                <span className={styles.studentDetail}>{activeDuration}</span>
              ) : null}
              <span className={styles.studentDetail}>
                {row.original.attendance
                  ? attendanceSourceLabel(row.original.attendance.source)
                  : "Not marked yet"}
              </span>
            </div>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "status",
        accessorFn: (row) => rosterStatus(row),
        header: "Status",
        cell: ({ getValue }) => (
          <StatusBadge
            status={getValue<AttendanceStatusValue | "UNMARKED">()}
          />
        ),
        filterFn: (row, _columnId, filterValue: AttendanceStatusFilter) => {
          if (!filterValue || filterValue === "all") return true;
          return rosterStatus(row.original) === filterValue;
        },
        sortingFn: (a, b) =>
          STATUS_ORDER[rosterStatus(a.original)] -
          STATUS_ORDER[rosterStatus(b.original)],
      },
      {
        id: "actions",
        header: "Mark",
        cell: ({ row }) => {
          const meta = metaRef.current;
          const rowPending =
            meta.actionsLocked ||
            meta.pendingStudentId === row.original.studentId;
          return (
            <div className={styles.rowActions}>
              <Button
                size="sm"
                variant="default"
                className={styles.markPresent}
                isDisabled={rowPending}
                data-testid={`mark-present-${row.original.studentId}`}
                onClick={() =>
                  meta.onMarkOne(row.original.studentId, "PRESENT")
                }
              >
                Present
              </Button>
              <Button
                size="sm"
                variant="danger"
                className={styles.markAbsent}
                isDisabled={rowPending}
                data-testid={`mark-absent-${row.original.studentId}`}
                onClick={() => meta.onMarkOne(row.original.studentId, "ABSENT")}
              >
                Absent
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [],
  );

  const columnFilters = useMemo(
    () => [{ id: "status", value: statusFilter }],
    [statusFilter],
  );

  const table = useReactTable({
    data: roster,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreModel,
    getSortedRowModel: getSortedModel,
    getFilteredRowModel: getFilteredModel,
    enableRowSelection: !markingDisabled,
    getRowId: (row) => row.studentId,
  });

  const selectedCount = useMemo(
    () => Object.values(rowSelection).reduce((n, on) => (on ? n + 1 : n), 0),
    [rowSelection],
  );
  const filteredCount = table.getFilteredRowModel().rows.length;

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleBulk = useCallback(
    (status: AttendanceStatusValue) => {
      const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
      if (ids.length === 0) return;
      onMarkSelected(ids, status);
      setRowSelection({});
    },
    [onMarkSelected, rowSelection],
  );

  const handleFilterToggle = useCallback((id: string) => {
    setStatusFilter(id as AttendanceStatusFilter);
  }, []);

  const selectedFilters = useMemo(() => [statusFilter], [statusFilter]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <FilterChipRow
          chips={STATUS_FILTER_CHIPS}
          selected={selectedFilters}
          onToggle={handleFilterToggle}
        />
        <div className={styles.toolbarActions}>
          {unmarkedCount > 0 && onMarkAllUnmarkedPresent ? (
            <Button
              variant="default"
              size="sm"
              className={styles.markPresent}
              isDisabled={actionsLocked}
              data-testid="mark-all-present"
              onClick={onMarkAllUnmarkedPresent}
            >
              Mark all unmarked present
            </Button>
          ) : null}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className={styles.selectionBar} role="status">
          <span className={styles.selectionLabel}>
            <strong>{selectedCount}</strong> selected
            {filteredCount !== roster.length
              ? ` of ${filteredCount} shown`
              : null}
          </span>
          <div className={styles.selectionActions}>
            <Button
              size="sm"
              variant="default"
              className={styles.markPresent}
              isDisabled={actionsLocked}
              data-testid="bulk-mark-present"
              onClick={() => handleBulk("PRESENT")}
            >
              Mark present
            </Button>
            <Button
              size="sm"
              variant="danger"
              className={styles.markAbsent}
              isDisabled={actionsLocked}
              data-testid="bulk-mark-absent"
              onClick={() => handleBulk("ABSENT")}
            >
              Mark absent
            </Button>
            <Button
              size="sm"
              variant="quiet"
              isDisabled={actionsLocked}
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={styles.th}
                      style={{
                        width:
                          header.column.columnDef.size != null
                            ? header.column.columnDef.size
                            : undefined,
                      }}
                      data-sortable={canSort ? "" : undefined}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : canSort
                              ? "none"
                              : undefined
                      }
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className={styles.sortButton}
                          data-direction={
                            sorted === "desc"
                              ? "descending"
                              : sorted === "asc"
                                ? "ascending"
                                : "none"
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          <Icon
                            name="chevron-up"
                            className={styles.sortIcon}
                            aria-hidden
                          />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={columns.length}>
                  No students match this status filter.
                </td>
              </tr>
            ) : (
              table
                .getRowModel()
                .rows.map((row) => (
                  <RosterRow
                    key={row.id}
                    row={row}
                    isSelected={row.getIsSelected()}
                    isRowPending={pendingStudentId === row.original.studentId}
                    actionsLocked={actionsLocked}
                    markingDisabled={markingDisabled}
                  />
                ))
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.footerMeta}>
        Showing {filteredCount} of {roster.length} · sorted by{" "}
        {sorting[0]
          ? `${sorting[0].id === "name" ? "name" : "status"}${
              sorting[0].desc ? " (desc)" : ""
            }`
          : "default"}
        {statusFilter !== "all"
          ? ` · filter: ${attendanceStatusLabel(statusFilter === "UNMARKED" ? "UNMARKED" : statusFilter)}`
          : null}
      </p>
    </div>
  );
}

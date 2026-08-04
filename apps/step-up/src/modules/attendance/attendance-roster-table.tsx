import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Checkbox } from "@dev-ui/components/checkbox";
import { Icon } from "@dev-ui/icons";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
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

const STATUS_FILTER_CHIPS = [
  { id: "all", label: "All" },
  { id: "UNMARKED", label: "Unmarked" },
  { id: "PRESENT", label: "Present" },
  { id: "ABSENT", label: "Absent" },
] as const;

type AttendanceRosterTableProps = {
  roster: AttendanceRosterEntry[];
  isBusy?: boolean | undefined;
  pendingStudentId?: string | null | undefined;
  onMarkOne: (studentId: string, status: AttendanceStatusValue) => void;
  onMarkSelected: (studentIds: string[], status: AttendanceStatusValue) => void;
  onMarkAllUnmarkedPresent?: (() => void) | undefined;
  unmarkedCount?: number | undefined;
};

function StatusBadge({
  status,
}: {
  status: AttendanceStatusValue | "UNMARKED";
}) {
  if (status === "PRESENT") {
    return (
      <Badge appearance="subtle" variant="success">
        Present
      </Badge>
    );
  }
  if (status === "ABSENT") {
    return (
      <Badge appearance="subtle" variant="danger">
        Absent
      </Badge>
    );
  }
  return (
    <Badge appearance="subtle" variant="warning">
      Unmarked
    </Badge>
  );
}

export function AttendanceRosterTable({
  roster,
  isBusy = false,
  pendingStudentId = null,
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

  const columns = useMemo<ColumnDef<AttendanceRosterEntry>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all students"
            isSelected={table.getIsAllPageRowsSelected()}
            isIndeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onChange={(selected) => table.toggleAllPageRowsSelected(selected)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.student.name}`}
            isSelected={row.getIsSelected()}
            isDisabled={!row.getCanSelect()}
            onChange={(selected) => row.toggleSelected(selected)}
          />
        ),
        enableSorting: false,
        size: 44,
      },
      {
        id: "name",
        accessorFn: (row) => row.student.name,
        header: "Student",
        cell: ({ row }) => (
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
            <span className={styles.studentDetail}>
              {row.original.attendance
                ? attendanceSourceLabel(row.original.attendance.source)
                : "Not marked yet"}
            </span>
          </div>
        ),
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
          const status = rosterStatus(row.original);
          const rowPending =
            isBusy || pendingStudentId === row.original.studentId;
          return (
            <div className={styles.rowActions}>
              <Button
                size="sm"
                variant={status === "PRESENT" ? "primary" : "default"}
                isDisabled={rowPending}
                data-testid={`mark-present-${row.original.studentId}`}
                onClick={() => onMarkOne(row.original.studentId, "PRESENT")}
              >
                Present
              </Button>
              <Button
                size="sm"
                variant={status === "ABSENT" ? "primary" : "default"}
                isDisabled={rowPending}
                data-testid={`mark-absent-${row.original.studentId}`}
                onClick={() => onMarkOne(row.original.studentId, "ABSENT")}
              >
                Absent
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [isBusy, onMarkOne, pendingStudentId],
  );

  const table = useReactTable({
    data: roster,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters: [
        {
          id: "status",
          value: statusFilter,
        },
      ],
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.studentId,
  });

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.studentId);
  const selectedCount = selectedIds.length;
  const filteredCount = table.getFilteredRowModel().rows.length;

  function clearSelection() {
    setRowSelection({});
  }

  function handleBulk(status: AttendanceStatusValue) {
    if (selectedIds.length === 0) return;
    onMarkSelected(selectedIds, status);
    clearSelection();
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <FilterChipRow
          chips={[...STATUS_FILTER_CHIPS]}
          selected={[statusFilter]}
          onToggle={(id) => setStatusFilter(id as AttendanceStatusFilter)}
        />
        <div className={styles.toolbarActions}>
          {unmarkedCount > 0 && onMarkAllUnmarkedPresent ? (
            <Button
              variant="default"
              size="sm"
              isDisabled={isBusy}
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
              variant="primary"
              isDisabled={isBusy}
              data-testid="bulk-mark-present"
              onClick={() => handleBulk("PRESENT")}
            >
              Mark present
            </Button>
            <Button
              size="sm"
              variant="default"
              isDisabled={isBusy}
              data-testid="bulk-mark-absent"
              onClick={() => handleBulk("ABSENT")}
            >
              Mark absent
            </Button>
            <Button
              size="sm"
              variant="quiet"
              isDisabled={isBusy}
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
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={styles.tr}
                  data-selected={row.getIsSelected() ? "" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={styles.td}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
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

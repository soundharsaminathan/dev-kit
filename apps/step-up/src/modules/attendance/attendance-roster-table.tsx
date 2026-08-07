import { Badge } from "@dev-ui/components/badge";
import { Button } from "@dev-ui/components/button";
import { Switch, SwitchControl } from "@dev-ui/components/switch";
import { useIsMobile } from "@dev-ui/hooks";
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
import { AppSheet } from "@/modules/ui/app-sheet";
import { FilterChipRow } from "@/modules/ui/filter-chip-row";
import staff from "@/modules/ui/staff.module.scss";
import { TouchButton } from "@/modules/ui/touch-button";
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
  requestMarkOne: (studentId: string, status: AttendanceStatusValue) => void;
};

type PendingConfirm =
  | {
      kind: "one";
      studentId: string;
      studentName: string;
      status: AttendanceStatusValue;
    }
  | {
      kind: "bulk";
      studentIds: string[];
      unpaidNames: string[];
      status: AttendanceStatusValue;
      scope: "selected" | "unmarked";
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

function AttendanceMarkSwitch({
  studentId,
  studentName,
  status,
  isDisabled,
  onMark,
}: {
  studentId: string;
  studentName: string;
  status: AttendanceStatusValue | "UNMARKED";
  isDisabled: boolean;
  onMark: (status: AttendanceStatusValue) => void;
}) {
  const isPresent = status === "PRESENT";
  const isAbsent = status === "ABSENT";

  return (
    <div
      className={styles.markSwitch}
      data-status={status === "UNMARKED" ? "unmarked" : status.toLowerCase()}
    >
      <button
        type="button"
        className={styles.markSwitchSide}
        data-tone="absent"
        data-active={isAbsent ? "true" : undefined}
        data-testid={`mark-absent-${studentId}`}
        disabled={isDisabled || isAbsent}
        aria-pressed={isAbsent}
        onClick={() => onMark("ABSENT")}
      >
        Absent
      </button>
      <Switch
        size="sm"
        {...(styles.markSwitchControl
          ? { className: styles.markSwitchControl }
          : {})}
      >
        <SwitchControl
          isSelected={isPresent}
          isDisabled={isDisabled}
          aria-label={`Mark ${studentName} ${isPresent ? "absent" : "present"}`}
          data-testid={`mark-attendance-${studentId}`}
          onChange={(selected) => onMark(selected ? "PRESENT" : "ABSENT")}
        />
      </Switch>
      <button
        type="button"
        className={styles.markSwitchSide}
        data-tone="present"
        data-active={isPresent ? "true" : undefined}
        data-testid={`mark-present-${studentId}`}
        disabled={isDisabled || isPresent}
        aria-pressed={isPresent}
        onClick={() => onMark("PRESENT")}
      >
        Present
      </button>
    </div>
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

function unpaidConfirmCopy(pending: PendingConfirm) {
  if (pending.kind === "one") {
    const action = pending.status === "PRESENT" ? "present" : "absent";
    return {
      title: "Unpaid plan",
      description: `${pending.studentName} has an unpaid plan. Mark ${action} anyway?`,
      confirmLabel: `Mark ${action}`,
    };
  }

  const action = pending.status === "PRESENT" ? "present" : "absent";
  const preview =
    pending.unpaidNames.length <= 3
      ? pending.unpaidNames.join(", ")
      : `${pending.unpaidNames.slice(0, 3).join(", ")} +${pending.unpaidNames.length - 3} more`;
  const who =
    pending.scope === "unmarked"
      ? `${pending.unpaidNames.length} unmarked student${pending.unpaidNames.length === 1 ? "" : "s"} have unpaid plans`
      : `${pending.unpaidNames.length} selected student${pending.unpaidNames.length === 1 ? "" : "s"} have unpaid plans`;

  return {
    title: "Unpaid plans",
    description: `${who} (${preview}). Mark ${action} anyway?`,
    confirmLabel: `Mark ${action}`,
  };
}

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
  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: false },
  ]);
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>("all");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const actionsLocked = isBusy || markingDisabled;

  const requestMarkOne = useCallback(
    (studentId: string, status: AttendanceStatusValue) => {
      const entry = roster.find((row) => row.studentId === studentId);
      if (!entry) return;
      if (rosterStatus(entry) === status) return;
      if (entry.monthlyUnpaid) {
        setPendingConfirm({
          kind: "one",
          studentId,
          studentName: entry.student.name,
          status,
        });
        return;
      }
      onMarkOne(studentId, status);
    },
    [onMarkOne, roster],
  );

  const metaRef = useRef<RosterTableMeta>({
    markingDisabled,
    actionsLocked,
    pendingStudentId,
    requestMarkOne,
  });
  metaRef.current = {
    markingDisabled,
    actionsLocked,
    pendingStudentId,
    requestMarkOne,
  };

  useEffect(() => {
    if (isMobile) {
      setRowSelection({});
    }
  }, [isMobile]);

  const columns = useMemo<ColumnDef<AttendanceRosterEntry>[]>(() => {
    const selectColumn: ColumnDef<AttendanceRosterEntry> = {
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
    };

    const nameColumn: ColumnDef<AttendanceRosterEntry> = {
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
    };

    const statusColumn: ColumnDef<AttendanceRosterEntry> = {
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
    };

    const actionsColumn: ColumnDef<AttendanceRosterEntry> = {
      id: "actions",
      header: "Mark",
      cell: ({ row }) => {
        const meta = metaRef.current;
        const rowPending =
          meta.actionsLocked ||
          meta.pendingStudentId === row.original.studentId;
        const status = rosterStatus(row.original);
        return (
          <AttendanceMarkSwitch
            studentId={row.original.studentId}
            studentName={row.original.student.name}
            status={status}
            isDisabled={rowPending}
            onMark={(next) =>
              meta.requestMarkOne(row.original.studentId, next)
            }
          />
        );
      },
      enableSorting: false,
    };

    return [selectColumn, nameColumn, statusColumn, actionsColumn];
  }, []);

  const columnFilters = useMemo(
    () => [{ id: "status", value: statusFilter }],
    [statusFilter],
  );

  const columnVisibility = useMemo(
    () => ({
      select: !isMobile,
      status: !isMobile,
    }),
    [isMobile],
  );

  const table = useReactTable({
    data: roster,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreModel,
    getSortedRowModel: getSortedModel,
    getFilteredRowModel: getFilteredModel,
    enableRowSelection: !isMobile && !markingDisabled,
    getRowId: (row) => row.studentId,
  });

  const selectedCount = useMemo(
    () => Object.values(rowSelection).reduce((n, on) => (on ? n + 1 : n), 0),
    [rowSelection],
  );
  const filteredCount = table.getFilteredRowModel().rows.length;
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleBulk = useCallback(
    (status: AttendanceStatusValue) => {
      const ids = Object.keys(rowSelection).filter((id) => rowSelection[id]);
      if (ids.length === 0) return;
      const unpaidNames = roster
        .filter((entry) => ids.includes(entry.studentId) && entry.monthlyUnpaid)
        .map((entry) => entry.student.name);
      if (unpaidNames.length > 0) {
        setPendingConfirm({
          kind: "bulk",
          studentIds: ids,
          unpaidNames,
          status,
          scope: "selected",
        });
        return;
      }
      onMarkSelected(ids, status);
      setRowSelection({});
    },
    [onMarkSelected, roster, rowSelection],
  );

  const handleMarkAllUnmarkedPresent = useCallback(() => {
    if (!onMarkAllUnmarkedPresent) return;
    const unpaidNames = roster
      .filter((entry) => !entry.attendance && entry.monthlyUnpaid)
      .map((entry) => entry.student.name);
    if (unpaidNames.length > 0) {
      setPendingConfirm({
        kind: "bulk",
        studentIds: [],
        unpaidNames,
        status: "PRESENT",
        scope: "unmarked",
      });
      return;
    }
    onMarkAllUnmarkedPresent();
  }, [onMarkAllUnmarkedPresent, roster]);

  const closeConfirm = useCallback(() => {
    setPendingConfirm(null);
  }, []);

  const confirmPending = useCallback(() => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === "one") {
      onMarkOne(pendingConfirm.studentId, pendingConfirm.status);
    } else if (pendingConfirm.scope === "unmarked") {
      onMarkAllUnmarkedPresent?.();
    } else {
      onMarkSelected(pendingConfirm.studentIds, pendingConfirm.status);
      setRowSelection({});
    }
    setPendingConfirm(null);
  }, [
    onMarkAllUnmarkedPresent,
    onMarkOne,
    onMarkSelected,
    pendingConfirm,
  ]);

  const handleFilterToggle = useCallback((id: string) => {
    setStatusFilter(id as AttendanceStatusFilter);
  }, []);

  const selectedFilters = useMemo(() => [statusFilter], [statusFilter]);
  const confirmCopy = pendingConfirm ? unpaidConfirmCopy(pendingConfirm) : null;

  return (
    <div className={styles.root} data-mobile={isMobile ? "true" : undefined}>
      <div className={styles.toolbar}>
        <FilterChipRow
          chips={STATUS_FILTER_CHIPS}
          selected={selectedFilters}
          onToggle={handleFilterToggle}
        />
        {!isMobile ? (
          <div className={styles.toolbarActions}>
            {unmarkedCount > 0 && onMarkAllUnmarkedPresent ? (
              <Button
                variant="default"
                size="sm"
                className={styles.markPresent}
                isDisabled={actionsLocked}
                data-testid="mark-all-present"
                onClick={handleMarkAllUnmarkedPresent}
              >
                Mark all unmarked present
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isMobile && selectedCount > 0 ? (
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
                <td className={styles.emptyCell} colSpan={visibleColumnCount}>
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

      <AppSheet
        isOpen={pendingConfirm != null}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
        title={confirmCopy?.title}
      >
        {confirmCopy ? (
          <div className={staff.sheetStack}>
            <p className={staff.rowMeta}>{confirmCopy.description}</p>
            <div className={staff.sheetActions}>
              <TouchButton
                variant="primary"
                fullWidth
                data-testid="confirm-unpaid-mark"
                onClick={confirmPending}
              >
                {confirmCopy.confirmLabel}
              </TouchButton>
              <TouchButton variant="quiet" fullWidth onClick={closeConfirm}>
                Cancel
              </TouchButton>
            </div>
          </div>
        ) : null}
      </AppSheet>
    </div>
  );
}

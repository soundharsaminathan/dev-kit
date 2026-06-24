import { cn, composeRefs } from "@dev-ui/core";
import { useFocusRing } from "@react-aria/focus";
import { useHover } from "@react-aria/interactions";
import type { AriaTableProps } from "@react-aria/table";
import {
  useTable,
  useTableCell,
  useTableColumnHeader,
  useTableHeaderRow,
  useTableRow,
  useTableRowGroup,
} from "@react-aria/table";
import { mergeProps } from "@react-aria/utils";
import {
  Cell as StatelyCell,
  Column as StatelyColumn,
  Row as StatelyRow,
  TableBody as StatelyTableBody,
  TableHeader as StatelyTableHeader,
  useTableState,
} from "@react-stately/table";
import type { Key, Node } from "@react-types/shared";
import {
  Children,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useMemo,
  useRef,
} from "react";
import { findChildByDisplayName } from "../list-box/collection-utils";
import styles from "./table.module.scss";
import type {
  TableBodyProps,
  TableCellProps,
  TableColumnDef,
  TableColumnProps,
  TableColumnRef,
  TableContextValue,
  TableHeaderProps,
  TableProps,
  TableRowProps,
} from "./table.types";

const TableContext = createContext<TableContextValue | null>(null);

function SortIcon({
  direction,
  className,
}: {
  direction?: "ascending" | "descending" | undefined;
  className?: string | undefined;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-direction={direction}
      className={className}
    >
      <path d="M12 5l6 7H6l6-7z" fill="currentColor" />
    </svg>
  );
}

function parseTableColumns(children: ReactNode): TableColumnDef[] {
  const columns: TableColumnDef[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    const type = child.type as { displayName?: string };
    if (type.displayName !== "TableColumn") {
      return;
    }
    const props = child.props as TableColumnProps;
    const label = props.children;
    columns.push({
      id: props.id,
      label,
      ...(props.isRowHeader !== undefined
        ? { isRowHeader: props.isRowHeader }
        : {}),
      ...(props.allowsSorting !== undefined
        ? { allowsSorting: props.allowsSorting }
        : {}),
      ...(props.textValue !== undefined ? { textValue: props.textValue } : {}),
    });
  });

  return columns;
}

function getTableRowCellRenderer(
  userRow: ReactElement,
): (column: TableColumnRef) => ReactElement {
  const type = userRow.type as { displayName?: string };
  if (type.displayName !== "TableRow") {
    throw new Error("TableBody render function must return a TableRow");
  }
  const cellRenderFn = (userRow.props as TableRowProps).children;
  if (typeof cellRenderFn !== "function") {
    throw new Error("TableRow must use a column render function");
  }
  return cellRenderFn;
}

function getTableCellContent(userCell: ReactNode): ReactNode {
  if (!isValidElement(userCell)) {
    return userCell;
  }
  const type = userCell.type as { displayName?: string };
  if (type.displayName !== "TableCell") {
    return userCell;
  }
  return (userCell.props as TableCellProps).children;
}

function buildStatelyChildren<T extends object>(
  columns: TableColumnDef[],
  items: Iterable<T> | undefined,
  rowRender: ((item: T) => ReactElement<TableRowProps>) | undefined,
) {
  const header = (
    <StatelyTableHeader key="header">
      {columns.map((column) => {
        const textValue =
          column.textValue ??
          (typeof column.label === "string" ? column.label : undefined);
        return (
          <StatelyColumn
            key={column.id}
            {...(textValue !== undefined ? { textValue } : {})}
            {...(column.allowsSorting !== undefined
              ? { allowsSorting: column.allowsSorting }
              : {})}
            {...(column.isRowHeader !== undefined
              ? { isRowHeader: column.isRowHeader }
              : {})}
          >
            {column.label}
          </StatelyColumn>
        );
      })}
    </StatelyTableHeader>
  );

  const body = (
    <StatelyTableBody {...(items !== undefined ? { items } : {})}>
      {(item: T) => {
        if (typeof rowRender !== "function") {
          return (
            <StatelyRow>{() => <StatelyCell>{null}</StatelyCell>}</StatelyRow>
          );
        }
        const userRow = rowRender(item);
        const cellRenderFn = getTableRowCellRenderer(userRow);
        return (
          <StatelyRow>
            {(columnKey: Key) => {
              const column: TableColumnRef = {
                id: columnKey,
                key: columnKey,
              };
              const userCell = cellRenderFn(column);
              return <StatelyCell>{getTableCellContent(userCell)}</StatelyCell>;
            }}
          </StatelyRow>
        );
      }}
    </StatelyTableBody>
  );

  return [header, body] as const;
}

function TableColumnHeaderRenderer<T extends object>({
  state,
  node,
}: {
  state: TableContextValue<T>["state"];
  node: Node<T>;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { columnHeaderProps, isPressed } = useTableColumnHeader(
    { node },
    state,
    ref,
  );
  const { hoverProps, isHovered } = useHover({
    isDisabled: !node.props.allowsSorting,
  });
  const { focusProps, isFocusVisible } = useFocusRing();
  const allowsSorting = node.props.allowsSorting;
  const isSorted = state.sortDescriptor?.column === node.key;
  const sortDirection = state.sortDescriptor?.direction;

  return (
    <th
      {...mergeProps(columnHeaderProps, hoverProps, focusProps)}
      ref={ref}
      data-table-column=""
      data-allows-sorting={allowsSorting ? "true" : undefined}
      data-sort-direction={isSorted ? sortDirection : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-pressed={isPressed ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={styles.column}
    >
      <span data-slot="label" className={styles.columnContent}>
        <span className={styles.columnLabel}>{node.rendered}</span>
        {allowsSorting && isSorted ? (
          <SortIcon
            direction={sortDirection}
            className={styles.sortIndicator}
          />
        ) : null}
      </span>
    </th>
  );
}

function TableHeaderRowRenderer<T extends object>({
  state,
  node,
}: {
  state: TableContextValue<T>["state"];
  node: Node<T>;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const { rowProps } = useTableHeaderRow({ node }, state, ref);

  return (
    <tr {...rowProps} ref={ref} data-table-header-row="" className={styles.row}>
      {[...(state.collection.getChildren?.(node.key) ?? [])].map(
        (columnNode) => {
          if (columnNode.type === "placeholder") {
            const placeholder = columnNode as Node<T> & { colSpan?: number };
            return (
              <th
                key={columnNode.key}
                colSpan={placeholder.colSpan ?? undefined}
              />
            );
          }
          return (
            <TableColumnHeaderRenderer
              key={columnNode.key}
              state={state}
              node={columnNode}
            />
          );
        },
      )}
    </tr>
  );
}

function TableCellRenderer<T extends object>({
  state,
  node,
}: {
  state: TableContextValue<T>["state"];
  node: Node<T>;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { gridCellProps } = useTableCell({ node }, state, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <td
      {...mergeProps(gridCellProps, focusProps)}
      ref={ref}
      data-table-cell=""
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={styles.cell}
    >
      {node.rendered}
    </td>
  );
}

function TableRowRenderer<T extends object>({
  state,
  node,
}: {
  state: TableContextValue<T>["state"];
  node: Node<T>;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const { rowProps, isSelected, isFocused } = useTableRow({ node }, state, ref);
  const { hoverProps, isHovered } = useHover({});
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <tr
      {...mergeProps(rowProps, hoverProps, focusProps)}
      ref={ref}
      data-table-row=""
      data-selected={isSelected ? "true" : undefined}
      data-hovered={isHovered ? "true" : undefined}
      data-focused={isFocused ? "true" : undefined}
      data-focus-visible={isFocusVisible ? "true" : undefined}
      className={styles.row}
    >
      {[...(state.collection.getChildren?.(node.key) ?? [])].map((cell) => (
        <TableCellRenderer key={cell.key} state={state} node={cell} />
      ))}
    </tr>
  );
}

function TableCollection<T extends object>({
  state,
  gridProps,
  className,
  ref,
}: {
  state: TableContextValue<T>["state"];
  gridProps: React.HTMLAttributes<HTMLTableElement>;
  className?: string | undefined;
  ref?: Ref<HTMLTableElement>;
}) {
  const { rowGroupProps: headerGroupProps } = useTableRowGroup();
  const { rowGroupProps: bodyGroupProps } = useTableRowGroup();
  const contextValue = useMemo(() => ({ state }), [state]);

  return (
    <TableContext.Provider value={contextValue}>
      <div data-table-wrapper="" className={styles.wrapper}>
        <table
          {...gridProps}
          ref={ref}
          data-table=""
          className={cn(styles.table, className)}
        >
          <thead
            {...headerGroupProps}
            data-table-header=""
            className={styles.header}
          >
            {state.collection.headerRows.map((headerRow) => (
              <TableHeaderRowRenderer
                key={headerRow.key}
                state={state}
                node={headerRow}
              />
            ))}
          </thead>
          <tbody {...bodyGroupProps} data-table-body="" className={styles.body}>
            {[...state.collection].map((row) => (
              <TableRowRenderer key={row.key} state={state} node={row} />
            ))}
          </tbody>
        </table>
      </div>
    </TableContext.Provider>
  );
}

function Table<T extends object>({
  ref,
  items,
  children,
  className,
  ...props
}: TableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const headerChild = findChildByDisplayName(children, "TableHeader");
  const bodyChild = findChildByDisplayName(children, "TableBody");

  const columns = useMemo(
    () =>
      parseTableColumns(
        headerChild ? (headerChild.props as TableHeaderProps).children : null,
      ),
    [headerChild],
  );

  const rowRender = bodyChild
    ? (bodyChild.props as TableBodyProps<T>).children
    : undefined;

  const statelyChildren = useMemo(
    () => buildStatelyChildren(columns, items, rowRender),
    [columns, items, rowRender],
  );

  const state = useTableState({
    ...props,
    children: [...statelyChildren],
  });

  const { gridProps } = useTable(props as AriaTableProps, state, tableRef);

  return (
    <TableCollection
      state={state}
      gridProps={gridProps}
      className={className}
      ref={composeRefs(tableRef, ref)}
    />
  );
}

function TableHeader(_props: TableHeaderProps) {
  return null;
}
TableHeader.displayName = "TableHeader";

function TableColumn(_props: TableColumnProps) {
  return null;
}
TableColumn.displayName = "TableColumn";

function TableBody<T extends object>(_props: TableBodyProps<T>) {
  return null;
}
TableBody.displayName = "TableBody";

function TableRow(_props: TableRowProps) {
  return null;
}
TableRow.displayName = "TableRow";

function TableCell(_props: TableCellProps) {
  return null;
}
TableCell.displayName = "TableCell";

export type {
  TableBodyProps,
  TableCellProps,
  TableColumnProps,
  TableHeaderProps,
  TableProps,
  TableRowProps,
} from "./table.types";
export { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow };

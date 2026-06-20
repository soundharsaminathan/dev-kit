import type { AriaTableProps } from "@react-aria/table";
import type { TableState, TableStateProps } from "@react-stately/table";
import type { Key } from "@react-types/shared";
import type { ReactElement, ReactNode, Ref } from "react";

export type { SortDescriptor } from "@react-types/shared";

export type TableColumnRef = {
  id: Key;
  key: Key;
};

export type TableColumnProps = {
  id: Key;
  isRowHeader?: boolean | undefined;
  allowsSorting?: boolean | undefined;
  textValue?: string | undefined;
  children?: ReactNode;
  className?: string | undefined;
};

export type TableHeaderProps = {
  children?: ReactNode;
  className?: string | undefined;
};

export type TableRowProps = {
  children?: ((column: TableColumnRef) => ReactElement) | undefined;
  className?: string | undefined;
};

export type TableCellProps = {
  children?: ReactNode;
  className?: string | undefined;
};

export type TableBodyProps<T extends object> = {
  children?: ((item: T) => ReactElement<TableRowProps>) | undefined;
  className?: string | undefined;
};

export type TableProps<T extends object> = AriaTableProps &
  Omit<TableStateProps<T>, "children"> & {
    items?: Iterable<T> | undefined;
    children?: ReactNode;
    className?: string | undefined;
    ref?: Ref<HTMLTableElement>;
  };

export type TableColumnDef = {
  id: Key;
  label: ReactNode;
  isRowHeader?: boolean | undefined;
  allowsSorting?: boolean | undefined;
  textValue?: string | undefined;
};

export type TableContextValue<T extends object = object> = {
  state: TableState<T>;
};

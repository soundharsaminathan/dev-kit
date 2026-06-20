import type { SortDescriptor } from "@dev-ui/components/table";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@dev-ui/components/table";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const users = [
  { id: "1", name: "Alice Chen", email: "alice@example.com", role: "Admin" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "Editor" },
  { id: "3", name: "Carol Jones", email: "carol@example.com", role: "Viewer" },
  { id: "4", name: "Dan Lee", email: "dan@example.com", role: "Editor" },
];

type TableStoryArgs = {
  ariaLabel: string;
  enableSorting: boolean;
  initialSortColumn: "name" | "email" | "role";
  initialSortDirection: "ascending" | "descending";
  selectionMode: "none" | "single" | "multiple";
};

const meta = {
  title: "Components/Table",
  tags: ["ai-generated"],
  argTypes: {
    ariaLabel: { control: "text" },
    enableSorting: { control: "boolean" },
    initialSortColumn: {
      control: "select",
      options: ["name", "email", "role"],
    },
    initialSortDirection: {
      control: "select",
      options: ["ascending", "descending"],
    },
    selectionMode: {
      control: "select",
      options: ["none", "single", "multiple"],
    },
  },
  args: {
    ariaLabel: "Users",
    enableSorting: false,
    initialSortColumn: "name",
    initialSortDirection: "ascending",
    selectionMode: "none",
  },
  render: function TableDemo({
    ariaLabel,
    enableSorting,
    initialSortColumn,
    initialSortDirection,
    selectionMode,
  }) {
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
      column: initialSortColumn,
      direction: initialSortDirection,
    });

    return (
      <Table
        aria-label={ariaLabel}
        items={users}
        selectionMode={selectionMode}
        {...(enableSorting
          ? { sortDescriptor, onSortChange: setSortDescriptor }
          : {})}
      >
        <TableHeader>
          <TableColumn id="name" allowsSorting={enableSorting}>
            Name
          </TableColumn>
          <TableColumn id="email" allowsSorting={enableSorting}>
            Email
          </TableColumn>
          <TableColumn id="role">Role</TableColumn>
        </TableHeader>
        <TableBody>
          {(item) => (
            <TableRow>
              {(column) => (
                <TableCell>{item[column.id as keyof typeof item]}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  },
} satisfies Meta<TableStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sortable: Story = {
  args: {
    enableSorting: true,
  },
};

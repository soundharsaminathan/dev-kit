import { DropZone, DropZoneLabel } from "@dev-ui/components/drop-zone";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

type DropZoneStoryArgs = {
  label: string;
  isDisabled: boolean;
};

const meta = {
  title: "Components/DropZone",
  tags: ["ai-generated"],
  argTypes: {
    label: { control: "text" },
    isDisabled: { control: "boolean" },
  },
  args: {
    label: "Drop files here",
    isDisabled: false,
  },
  render: function DropZoneDemo({ label, isDisabled }) {
    const [message, setMessage] = useState(label);

    return (
      <DropZone
        isDisabled={isDisabled}
        onDrop={async (event) => {
          if (!("items" in event)) {
            return;
          }

          const names = await Promise.all(
            [...event.items]
              .filter((item) => item.kind === "file")
              .map(async (item) => {
                const file = await item.getFile();
                return file.name;
              }),
          );
          setMessage(names.filter(Boolean).join(", ") || "Dropped");
        }}
      >
        <DropZoneLabel>{message}</DropZoneLabel>
      </DropZone>
    );
  },
} satisfies Meta<DropZoneStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    isDisabled: true,
    label: "Disabled drop zone",
  },
};

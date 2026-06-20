import { Button } from "@dev-ui/components/button";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

type FileTriggerStoryArgs = {
  buttonLabel: string;
  accept: string;
  allowsMultiple: boolean;
  allowsClearing: boolean;
  clearLabel: string;
  isDisabled: boolean;
};

const meta = {
  title: "Components/FileTrigger",
  tags: ["ai-generated"],
  argTypes: {
    buttonLabel: { control: "text" },
    accept: { control: "text" },
    allowsMultiple: { control: "boolean" },
    allowsClearing: { control: "boolean" },
    clearLabel: { control: "text" },
    isDisabled: { control: "boolean" },
  },
  args: {
    buttonLabel: "Choose file",
    accept: "image/*",
    allowsMultiple: false,
    allowsClearing: true,
    clearLabel: "Clear selection",
    isDisabled: false,
  },
  render: function FileTriggerDemo({
    buttonLabel,
    accept,
    allowsMultiple,
    allowsClearing,
    clearLabel,
    isDisabled,
  }) {
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileNames, setFileNames] = useState<string[]>([]);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <FileTrigger
          accept={accept}
          allowsMultiple={allowsMultiple}
          allowsClearing={allowsClearing}
          clearLabel={clearLabel}
          isDisabled={isDisabled}
          onSelect={(files) => {
            if (allowsMultiple) {
              setFileNames(files ? Array.from(files, (file) => file.name) : []);
              return;
            }
            setFileName(files?.[0]?.name ?? null);
          }}
        >
          <Button>
            {allowsMultiple
              ? fileNames.length > 0
                ? `${fileNames.length} file${fileNames.length === 1 ? "" : "s"} selected`
                : buttonLabel
              : (fileName ?? buttonLabel)}
          </Button>
        </FileTrigger>
        {allowsMultiple && fileNames.length > 0 ? (
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {fileNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
} satisfies Meta<FileTriggerStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  args: {
    buttonLabel: "Choose files",
    allowsMultiple: true,
    clearLabel: "Clear all files",
  },
};

import { Label } from "@dev-ui/components/field";
import { Group } from "@dev-ui/components/group";
import { Input } from "@dev-ui/components/input";
import { OTPField, OTPFieldSeparator } from "@dev-ui/components/otp-field";
import type { Meta, StoryObj } from "@storybook/react-vite";

type OTPFieldStoryArgs = {
  length: number;
  isDisabled: boolean;
  isInvalid: boolean;
  isReadOnly: boolean;
  isRequired: boolean;
  labelText: string;
  showSeparator: boolean;
};

const meta = {
  title: "Components/OTPField",
  tags: ["ai-generated"],
  argTypes: {
    length: { control: { type: "number", min: 4, max: 8, step: 1 } },
    isDisabled: { control: "boolean" },
    isInvalid: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isRequired: { control: "boolean" },
    labelText: { control: "text" },
    showSeparator: { control: "boolean" },
  },
  args: {
    length: 6,
    isDisabled: false,
    isInvalid: false,
    isReadOnly: false,
    isRequired: false,
    labelText: "Verification code",
    showSeparator: false,
  },
  render: ({ labelText, showSeparator, length, ...props }) => (
    <OTPField {...props} length={length} aria-label={labelText}>
      <Label>{labelText}</Label>
      {showSeparator ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          <Group>
            <Input />
            <Input aria-label="Digit 2" />
            <Input aria-label="Digit 3" />
          </Group>
          <OTPFieldSeparator>-</OTPFieldSeparator>
          <Group>
            <Input aria-label="Digit 4" />
            <Input aria-label="Digit 5" />
            <Input aria-label="Digit 6" />
          </Group>
        </div>
      ) : null}
    </OTPField>
  ),
} satisfies Meta<OTPFieldStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Separator: Story = {
  args: {
    showSeparator: true,
  },
};

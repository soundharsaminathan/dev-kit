import { Calendar } from "@dev-ui/components/calendar";
import { getLocalTimeZone, today } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Calendar",
  tags: ["ai-generated"],
  component: Calendar,
  argTypes: {
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
  },
  args: {
    "aria-label": "Event date",
    isDisabled: false,
    isReadOnly: false,
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelectedDate: Story = {
  args: {
    defaultValue: today(getLocalTimeZone()),
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

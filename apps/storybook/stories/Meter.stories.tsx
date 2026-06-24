import { Meter, MeterOutput, MeterTrack } from "@dev-ui/components/meter";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Meter",
  component: Meter,
  tags: ["ai-generated"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
    minValue: { control: "number" },
    maxValue: { control: "number" },
    "aria-label": { control: "text" },
  },
  args: {
    "aria-label": "Storage used",
    value: 60,
    minValue: 0,
    maxValue: 100,
  },
  render: (args) => (
    <Meter {...args}>
      <MeterTrack />
      <MeterOutput />
    </Meter>
  ),
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

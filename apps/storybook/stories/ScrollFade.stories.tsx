import { ScrollFade } from "@dev-ui/components/scroll-fade";
import type { Meta, StoryObj } from "@storybook/react-vite";

type ScrollFadeStoryArgs = {
  direction: "vertical" | "horizontal";
  itemCount: number;
  width: number;
  height: number;
};

const meta = {
  title: "Components/ScrollFade",
  tags: ["ai-generated"],
  argTypes: {
    direction: {
      control: "select",
      options: ["vertical", "horizontal"],
    },
    itemCount: { control: { type: "number", min: 5, max: 30 } },
    width: { control: { type: "number", min: 120, max: 400 } },
    height: { control: { type: "number", min: 80, max: 300 } },
  },
  args: {
    direction: "vertical",
    itemCount: 20,
    width: 240,
    height: 160,
  },
  render: ({ direction, itemCount, width, height }) => {
    const items = Array.from(
      { length: itemCount },
      (_, index) => `Item ${index + 1}`,
    );

    if (direction === "horizontal") {
      return (
        <ScrollFade
          style={{ width, overflowX: "auto", border: "1px solid #ccc" }}
        >
          <div
            style={{ display: "flex", gap: 8, width: width * 2.5, padding: 8 }}
          >
            {items.map((id, index) => (
              <div
                key={id}
                style={{
                  minWidth: 80,
                  padding: 16,
                  background: "#eee",
                  borderRadius: 8,
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </ScrollFade>
      );
    }

    return (
      <ScrollFade style={{ height, width, border: "1px solid #ccc" }}>
        {items.map((label) => (
          <p key={label} style={{ margin: "0 0 8px" }}>
            {label}
          </p>
        ))}
      </ScrollFade>
    );
  },
} satisfies Meta<ScrollFadeStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = {
  args: {
    direction: "horizontal",
    itemCount: 12,
  },
};

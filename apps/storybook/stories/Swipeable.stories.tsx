import { Button } from "@dev-ui/components/button";
import { Swipeable } from "@dev-ui/components/swipeable";
import { Icon } from "@dev-ui/icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

type SwipeableStoryArgs = {
  label: string;
  threshold: number;
};

const meta = {
  title: "Components/Swipeable",
  tags: ["ai-generated"],
  argTypes: {
    label: { control: "text" },
    threshold: { control: { type: "number", min: 20, max: 200, step: 10 } },
  },
  args: {
    label: "Asha Rao · +91 91234 56789",
    threshold: 80,
  },
  render: function SwipeableDemo({ label, threshold }) {
    const [archived, setArchived] = useState(false);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Swipeable
          direction="horizontal"
          threshold={threshold}
          ariaLabel={`Actions for ${label}`}
          onSwipeLeft={() => setArchived(true)}
          onSwipeRight={() => setArchived(false)}
          leftActions={
            <Button
              variant="quiet"
              isIconOnly
              aria-label="Edit"
              onClick={() => setArchived(false)}
            >
              <Icon name="edit" />
            </Button>
          }
          rightActions={
            <Button
              variant="quiet"
              isIconOnly
              aria-label="Archive"
              isDisabled={archived}
              onClick={() => setArchived(true)}
            >
              <Icon name="archive" />
            </Button>
          }
          fallbackActions={
            <Button
              variant="quiet"
              isIconOnly
              aria-label="Archive (fallback)"
              isDisabled={archived}
              onClick={() => setArchived(true)}
            >
              <Icon name="archive" />
            </Button>
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: "1.25rem",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "0.75rem",
                background:
                  "color-mix(in srgb, var(--color-primary) 18%, transparent)",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong>{label}</strong>
              <small style={{ color: "var(--color-fg-muted)" }}>
                {archived
                  ? "Archived — not calling anymore."
                  : "Swipe left to archive."}
              </small>
            </div>
          </div>
        </Swipeable>
      </div>
    );
  },
} satisfies Meta<SwipeableStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFallbackOnly: Story = {
  args: {
    label: "Fallback actions only (keyboard / desktop)",
  },
  render: function FallbackDemo({ label, threshold }) {
    return (
      <Swipeable
        direction="horizontal"
        threshold={threshold}
        ariaLabel={`Actions for ${label}`}
        fallbackActions={
          <Button
            variant="quiet"
            isIconOnly
            aria-label="Archive"
            onClick={() => undefined}
          >
            <Icon name="archive" />
          </Button>
        }
      >
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "1.25rem",
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          {label}
        </div>
      </Swipeable>
    );
  },
};

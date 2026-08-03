import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  XAxis,
} from "../index";

const data = [
  { label: "Mon", net: 1200 },
  { label: "Tue", net: 1800 },
  { label: "Wed", net: 900 },
];

const config = {
  net: {
    label: "Net",
    color: "var(--color-primary)",
  },
};

describe("Chart", () => {
  it("renders a labeled chart container", () => {
    render(
      <ChartContainer
        config={config}
        aria-label="Revenue trend"
        style={{ height: 200 }}
      >
        <AreaChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            dataKey="net"
            type="monotone"
            fill="var(--color-net)"
            stroke="var(--color-net)"
          />
        </AreaChart>
      </ChartContainer>,
    );

    expect(screen.getByLabelText("Revenue trend")).toBeInTheDocument();
  });
});

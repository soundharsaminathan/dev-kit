import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChartTooltipContentProps } from "../chart.types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartProvider,
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
  gross: {
    label: "Gross",
    theme: { light: "#111", dark: "#eee" },
  },
  bare: {},
};

function IconStub() {
  return <span data-testid="legend-icon">icon</span>;
}

function tooltipPayload(
  items: Array<Record<string, unknown>>,
): NonNullable<ChartTooltipContentProps["payload"]> {
  return items.map((item, index) => ({
    graphicalItemId: `item-${index}`,
    ...item,
  })) as NonNullable<ChartTooltipContentProps["payload"]>;
}

describe("Chart", () => {
  it("renders a labeled chart container", () => {
    render(
      <ChartContainer
        id="revenue"
        config={config}
        aria-label="Revenue trend"
        style={{ height: 200 }}
      >
        <AreaChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
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

  it("applies theme and direct colors as CSS variables", () => {
    const { container } = render(
      <ChartContainer config={config} aria-label="Colored">
        <AreaChart data={data}>
          <Area dataKey="net" />
        </AreaChart>
      </ChartContainer>,
    );

    const root = container.querySelector("[data-chart]") as HTMLElement;
    expect(root.style.getPropertyValue("--color-net")).toBe(
      "var(--color-primary)",
    );
    expect(root.style.getPropertyValue("--color-gross")).toBe("#111");
    expect(root.style.getPropertyValue("--color-bare")).toBe("");
  });

  it("throws when tooltip content is used outside a chart provider", () => {
    expect(() =>
      render(<ChartTooltipContent active payload={tooltipPayload([])} />),
    ).toThrow(/must be used within ChartContainer/);
  });

  it("returns null for inactive or empty tooltip payloads", () => {
    const { rerender, container } = render(
      <ChartProvider config={config}>
        <ChartTooltipContent
          active={false}
          payload={tooltipPayload([{ value: 1 }])}
        />
      </ChartProvider>,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <ChartProvider config={config}>
        <ChartTooltipContent active payload={tooltipPayload([])} />
      </ChartProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders tooltip rows with formatters, indicators, and label options", () => {
    const labelFormatter = vi.fn(() => "Formatted label");
    const formatter = vi.fn(() => "1.2k");

    const { rerender } = render(
      <ChartProvider config={config}>
        <ChartTooltipContent
          active
          label="Mon"
          labelFormatter={labelFormatter}
          formatter={formatter}
          indicator="dashed"
          payload={tooltipPayload([
            {
              dataKey: "net",
              name: "Net",
              value: 1200,
              color: "#f00",
              payload: { net: "net" },
            },
            {
              dataKey: 2,
              name: "Other",
              value: undefined,
              payload: null,
            },
          ])}
        />
      </ChartProvider>,
    );

    expect(screen.getByText("Formatted label")).toBeInTheDocument();
    expect(screen.getByText("1.2k")).toBeInTheDocument();
    expect(labelFormatter).toHaveBeenCalled();
    expect(formatter).toHaveBeenCalled();

    rerender(
      <ChartProvider config={config}>
        <ChartTooltipContent
          active
          hideLabel
          hideIndicator
          nameKey="custom"
          labelKey="custom"
          payload={tooltipPayload([
            {
              name: "Fallback",
              value: 42,
              payload: { custom: "gross" },
            },
          ])}
        />
      </ChartProvider>,
    );

    expect(screen.queryByText("Formatted label")).not.toBeInTheDocument();
    expect(screen.getByText("Gross")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("falls back to payload label when config has no matching entry", () => {
    render(
      <ChartProvider config={config}>
        <ChartTooltipContent
          active
          label="Raw"
          payload={tooltipPayload([
            {
              dataKey: "missing",
              name: "Missing series",
              value: 7,
              payload: "not-an-object",
            },
          ])}
        />
      </ChartProvider>,
    );

    expect(screen.getByText("Raw")).toBeInTheDocument();
    expect(screen.getByText("Missing series")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("covers tooltip/legend nullish fallbacks", () => {
    const formatter = vi.fn(() => "fmt");
    render(
      <ChartProvider config={config}>
        <ChartTooltipContent
          active
          formatter={formatter}
          payload={tooltipPayload([
            {
              value: 9,
              payload: {},
            },
          ])}
        />
        <ChartLegendContent
          payload={[{ dataKey: "net", color: "#0f0" }, { color: "#00f" }]}
        />
      </ChartProvider>,
    );

    expect(screen.getByText("fmt")).toBeInTheDocument();
    expect(formatter).toHaveBeenCalled();
    expect(screen.getByText("Net")).toBeInTheDocument();
  });

  it("renders legend content with icons, swatches, and empty states", () => {
    const { rerender, container } = render(
      <ChartProvider
        config={{
          net: { label: "Net", icon: IconStub, color: "#0f0" },
        }}
      >
        <ChartLegendContent
          payload={[
            { value: "Net", dataKey: "net", color: "#0f0" },
            { value: "Other", color: "#00f" },
          ]}
        />
      </ChartProvider>,
    );

    expect(screen.getByTestId("legend-icon")).toBeInTheDocument();
    expect(screen.getByText("Net")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();

    rerender(
      <ChartProvider config={config}>
        <ChartLegendContent
          hideIcon
          nameKey="alias"
          payload={[{ value: "Gross", dataKey: "x", color: "#111" }]}
        />
      </ChartProvider>,
    );
    expect(screen.queryByTestId("legend-icon")).not.toBeInTheDocument();

    rerender(
      <ChartProvider config={config}>
        <ChartLegendContent payload={[]} />
      </ChartProvider>,
    );
    expect(container.querySelector("[class*='legend']")).toBeNull();
  });
});

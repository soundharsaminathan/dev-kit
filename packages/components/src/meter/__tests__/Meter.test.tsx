import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Meter, MeterOutput, MeterTrack } from "../index";

describe("Meter", () => {
  it("renders with meter role", () => {
    render(
      <Meter aria-label="Storage used" value={40} minValue={0} maxValue={100}>
        <MeterTrack />
        <MeterOutput />
      </Meter>,
    );

    expect(screen.getByRole("meter")).toBeInTheDocument();
  });

  it("renders with data-meter attribute", () => {
    const { container } = render(
      <Meter aria-label="Storage used" value={40}>
        <MeterTrack />
      </Meter>,
    );

    expect(container.querySelector("[data-meter='']")).toBeInTheDocument();
  });

  it("sets fill width from value", () => {
    const { container } = render(
      <Meter aria-label="Storage used" value={25} minValue={0} maxValue={100}>
        <MeterTrack />
      </Meter>,
    );

    const fill = container.querySelector("[data-meter-fill='']");
    expect(fill).toHaveStyle({ width: "25%" });
  });
});

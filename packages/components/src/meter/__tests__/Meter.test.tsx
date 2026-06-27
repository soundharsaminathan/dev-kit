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

  it("renders default track and output children", () => {
    render(<Meter aria-label="Storage used" value={40} />);

    expect(screen.getByRole("meter")).toBeInTheDocument();
    expect(document.querySelector("[data-meter-fill='']")).toBeInTheDocument();
  });

  it("handles undefined values and invalid ranges", () => {
    const { container, rerender } = render(
      <Meter aria-label="Storage used" value={undefined}>
        <MeterTrack />
      </Meter>,
    );

    expect(container.querySelector("[data-meter-fill='']")).toHaveStyle({
      width: "0%",
    });

    rerender(
      <Meter aria-label="Storage used" value={10} minValue={100} maxValue={100}>
        <MeterTrack />
      </Meter>,
    );

    expect(container.querySelector("[data-meter-fill='']")).toHaveStyle({
      width: "0%",
    });
  });

  it("renders meter output text", () => {
    render(
      <Meter aria-label="Storage used" value={40} minValue={0} maxValue={100}>
        <MeterTrack />
        <MeterOutput />
      </Meter>,
    );

    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext");
  });

  it("renders custom meter output children", () => {
    render(
      <Meter aria-label="Storage used" value={40} minValue={0} maxValue={100}>
        <MeterTrack />
        <MeterOutput>40% full</MeterOutput>
      </Meter>,
    );

    expect(screen.getByText("40% full")).toBeInTheDocument();
  });
});

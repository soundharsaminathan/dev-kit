import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ProgressBar,
  ProgressBarFill,
  ProgressBarOutput,
  ProgressBarTrack,
} from "../ProgressBar";

describe("ProgressBar", () => {
  it("renders as progressbar", () => {
    render(<ProgressBar value={50} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows output value text", () => {
    render(
      <ProgressBar value={50} aria-label="Upload progress">
        <ProgressBarOutput />
      </ProgressBar>,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders a filled track at the given value", () => {
    const { container } = render(
      <ProgressBar value={50} aria-label="Upload progress" />,
    );
    const fill = container.querySelector("[class*='fill']") as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe("50%");
  });

  it("supports indeterminate state", () => {
    const { container } = render(
      <ProgressBar isIndeterminate aria-label="Loading" />,
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(container.querySelector("[data-indeterminate='true']")).toBeTruthy();
  });

  it("handles equal min and max values", () => {
    const { container } = render(
      <ProgressBar
        value={50}
        minValue={100}
        maxValue={100}
        aria-label="Upload progress"
      />,
    );
    const fill = container.querySelector("[class*='fill']") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("renders custom output content", () => {
    render(
      <ProgressBar value={50} aria-label="Upload progress">
        <ProgressBarOutput>Halfway there</ProgressBarOutput>
      </ProgressBar>,
    );
    expect(screen.getByText("Halfway there")).toBeInTheDocument();
  });

  it("renders compound track layout", () => {
    const { container } = render(
      <ProgressBar value={25} aria-label="Upload progress">
        <ProgressBarTrack>
          <ProgressBarFill />
          <ProgressBarOutput />
        </ProgressBarTrack>
      </ProgressBar>,
    );

    expect(container.querySelector("[class*='track']")).toBeTruthy();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("throws when ProgressBarFill is used outside ProgressBar", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ProgressBarFill />)).toThrow(
      "ProgressBarFill must be used within ProgressBar",
    );

    consoleError.mockRestore();
  });

  it("throws when ProgressBarOutput is used outside ProgressBar", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ProgressBarOutput />)).toThrow(
      "ProgressBarOutput must be used within ProgressBar",
    );

    consoleError.mockRestore();
  });
});

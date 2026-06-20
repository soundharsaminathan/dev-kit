import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Slider,
  SliderControl,
  SliderFill,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "../Slider";

describe("Slider", () => {
  it("renders a slider", () => {
    render(<Slider defaultValue={50} aria-label="Volume" />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("shows the current value in output", () => {
    render(<Slider defaultValue={50} aria-label="Volume" />);
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("renders a fill element", () => {
    const { container } = render(
      <Slider defaultValue={50} aria-label="Volume" />,
    );
    expect(container.querySelector("[data-slider-fill]")).toBeTruthy();
  });

  it("renders a vertical slider with vertical fill positioning", () => {
    const { container } = render(
      <Slider defaultValue={50} aria-label="Volume" orientation="vertical" />,
    );

    const root = container.querySelector("[data-slider]");
    expect(root).toHaveAttribute("data-orientation", "vertical");

    const fill = container.querySelector("[data-slider-fill]") as HTMLElement;
    expect(fill.style.bottom).toBeTruthy();
    expect(fill.style.height).toBeTruthy();
    expect(fill.style.left).toBeFalsy();
  });

  it("renders range sliders with multiple thumbs", () => {
    render(
      <Slider defaultValue={[25, 75]} aria-label="Range">
        <SliderControl>
          <SliderTrack>
            <SliderFill />
            <SliderThumb index={0} />
            <SliderThumb index={1} />
          </SliderTrack>
        </SliderControl>
        <SliderOutput />
      </Slider>,
    );

    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(screen.getByText("25 – 75")).toBeInTheDocument();
  });

  it("marks disabled state on control, output, and thumb", () => {
    const { container } = render(
      <Slider defaultValue={50} aria-label="Volume" isDisabled />,
    );

    expect(container.querySelector("[data-slider-control]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(container.querySelector("[data-slider-output]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    expect(container.querySelector("[data-slider-thumb]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("reflects dragging state on the thumb", () => {
    render(<Slider defaultValue={50} aria-label="Volume" />);
    const thumb = screen.getByRole("slider");

    fireEvent.pointerDown(thumb, {
      pointerType: "mouse",
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerMove(thumb, { pointerType: "mouse", clientX: 100 });

    expect(document.querySelector("[data-dragging='true']")).toBeTruthy();
  });

  it("reflects focus-visible state on the thumb", () => {
    render(<Slider defaultValue={50} aria-label="Volume" />);
    const thumb = screen.getByRole("slider");

    act(() => {
      thumb.focus();
    });
    fireEvent.keyDown(thumb, { key: "Tab" });

    expect(document.querySelector("[data-focus-visible='true']")).toBeTruthy();
  });

  it("renders custom output content", () => {
    render(
      <Slider defaultValue={50} aria-label="Volume">
        <SliderControl />
        <SliderOutput>Custom output</SliderOutput>
      </Slider>,
    );

    expect(screen.getByText("Custom output")).toBeInTheDocument();
  });

  it("throws when SliderControl is used outside Slider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SliderControl />)).toThrow(
      "SliderControl must be used within Slider",
    );

    consoleError.mockRestore();
  });

  it("throws when SliderTrack is used outside Slider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SliderTrack />)).toThrow(
      "SliderTrack must be used within Slider",
    );

    consoleError.mockRestore();
  });

  it("throws when SliderFill is used outside Slider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SliderFill />)).toThrow(
      "SliderFill must be used within Slider",
    );

    consoleError.mockRestore();
  });

  it("throws when SliderThumb is used outside Slider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SliderThumb />)).toThrow(
      "SliderThumb must be used within Slider",
    );

    consoleError.mockRestore();
  });

  it("throws when SliderOutput is used outside Slider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<SliderOutput />)).toThrow(
      "SliderOutput must be used within Slider",
    );

    consoleError.mockRestore();
  });
});

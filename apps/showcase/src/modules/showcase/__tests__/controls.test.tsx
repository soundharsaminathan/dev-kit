import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test-utils/providers";
import { withReactAriaLabelWarningGuard } from "@/test-utils/react-aria-warnings";
import { Controls } from "../controls";
import type { SerializableControl } from "../types";

const controls: SerializableControl[] = [
  { name: "children", type: "string", defaultValue: "Button" },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "count", type: "number", defaultValue: 2 },
  {
    name: "variant",
    type: "enum",
    options: ["default", "primary"],
    defaultValue: "default",
  },
];

describe("Controls", () => {
  it("renders a control for each config entry", () => {
    render(
      <TestProviders>
        <Controls
          controls={controls}
          values={{
            children: "Button",
            disabled: false,
            count: 2,
            variant: "default",
          }}
          onChange={vi.fn()}
        />
      </TestProviders>,
    );

    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Variant/ })).toBeInTheDocument();
  });

  it("calls onChange when string input changes", () => {
    const onChange = vi.fn();
    render(
      <Controls
        controls={[{ name: "children", type: "string", defaultValue: "" }]}
        values={{ children: "" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Updated" },
    });
    expect(onChange).toHaveBeenCalledWith("children", "Updated");
  });

  it("calls onChange when boolean switch toggles", () => {
    const onChange = vi.fn();
    render(
      <Controls
        controls={[{ name: "disabled", type: "boolean", defaultValue: false }]}
        values={{ disabled: false }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith("disabled", true);
  });

  it("calls onChange when number input changes", () => {
    const onChange = vi.fn();
    render(
      <Controls
        controls={[{ name: "count", type: "number", defaultValue: 0 }]}
        values={{ count: 0 }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith("count", 5);
  });

  it("formats aria-label control names", () => {
    render(
      <Controls
        controls={[{ name: "aria-label", type: "string", defaultValue: "" }]}
        values={{ "aria-label": "" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Aria label")).toBeInTheDocument();
  });

  it("ignores unsupported control types", () => {
    render(
      <Controls
        controls={[
          { name: "custom", type: "unknown" as "string", defaultValue: "" },
        ]}
        values={{ custom: "" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not emit React Aria label warnings for enum selects", async () => {
    await withReactAriaLabelWarningGuard(() => {
      render(
        <TestProviders>
          <Controls
            controls={[
              {
                name: "variant",
                type: "enum",
                options: ["default", "primary"],
                defaultValue: "default",
              },
            ]}
            values={{ variant: "default" }}
            onChange={vi.fn()}
          />
        </TestProviders>,
      );
    });
  });

  it("does not emit React Aria label warnings under StrictMode", async () => {
    await withReactAriaLabelWarningGuard(() => {
      render(
        <StrictMode>
          <TestProviders>
            <Controls
              controls={[
                {
                  name: "variant",
                  type: "enum",
                  options: ["default", "primary"],
                  defaultValue: "default",
                },
                {
                  name: "size",
                  type: "enum",
                  options: ["sm", "md"],
                  defaultValue: "md",
                },
              ]}
              values={{ variant: "default", size: "md" }}
              onChange={vi.fn()}
            />
          </TestProviders>
        </StrictMode>,
      );
    });
  });
});

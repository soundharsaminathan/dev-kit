import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { buttonConfig } from "@/registry/button/config";
import buttonPlayground from "@/registry/button/playground";
import {
  expectNoA11yViolations,
  expectNoAriaViolations,
  expectNoColorContrastViolations,
} from "@/test-utils/a11y";
import { TestProviders } from "@/test-utils/providers";
import { withReactAriaLabelWarningGuard } from "@/test-utils/react-aria-warnings";
import { InteractiveDemo } from "../interactive-demo";

function StubPlayground({ children }: { children?: string }) {
  return <div data-testid="playground">{children}</div>;
}

describe("InteractiveDemo", () => {
  it("renders playground with default control values", () => {
    render(
      <TestProviders>
        <InteractiveDemo
          Playground={StubPlayground as ComponentType<Record<string, unknown>>}
          controls={[{ name: "children", type: "string", defaultValue: "Hi" }]}
        />
      </TestProviders>,
    );

    expect(screen.getByTestId("playground")).toHaveTextContent("Hi");
    expect(screen.getByText("Playground")).toBeInTheDocument();
  });

  it("updates preview when a control changes", () => {
    render(
      <TestProviders>
        <InteractiveDemo
          Playground={StubPlayground as ComponentType<Record<string, unknown>>}
          controls={[{ name: "children", type: "string", defaultValue: "Hi" }]}
        />
      </TestProviders>,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Changed" },
    });
    expect(screen.getByTestId("playground")).toHaveTextContent("Changed");
  });

  it("renders the real button playground", () => {
    render(
      <TestProviders>
        <InteractiveDemo
          Playground={buttonPlayground}
          controls={buttonConfig.controls}
        />
      </TestProviders>,
    );

    expect(screen.getByRole("button", { name: "Button" })).toBeInTheDocument();
  });

  it("uses a custom title and normalizeControlValues", () => {
    const normalizeControlValues = vi.fn((values: Record<string, unknown>) => ({
      ...values,
      children: "Normalized",
    }));

    render(
      <TestProviders>
        <InteractiveDemo
          Playground={StubPlayground as ComponentType<Record<string, unknown>>}
          controls={[{ name: "children", type: "string", defaultValue: "Hi" }]}
          title="Custom title"
          normalizeControlValues={normalizeControlValues}
        />
      </TestProviders>,
    );

    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(normalizeControlValues).toHaveBeenCalled();
    expect(screen.getByTestId("playground")).toHaveTextContent("Normalized");
  });

  it("does not emit React Aria label warnings for enum playground controls", async () => {
    await withReactAriaLabelWarningGuard(() => {
      render(
        <TestProviders>
          <InteractiveDemo
            Playground={buttonPlayground}
            controls={buttonConfig.controls}
          />
        </TestProviders>,
      );
    });
  });

  describe.sequential("accessibility", () => {
    const a11yTimeout = 30_000;

    it(
      "has no WCAG violations",
      async () => {
        const { container } = render(
          <TestProviders>
            <InteractiveDemo
              Playground={buttonPlayground}
              controls={buttonConfig.controls}
            />
          </TestProviders>,
        );

        await expectNoA11yViolations(container);
      },
      a11yTimeout,
    );

    it(
      "has no color contrast violations",
      async () => {
        const { container } = render(
          <TestProviders>
            <InteractiveDemo
              Playground={buttonPlayground}
              controls={buttonConfig.controls}
            />
          </TestProviders>,
        );

        await expectNoColorContrastViolations(container);
      },
      a11yTimeout,
    );

    it(
      "has no ARIA violations",
      async () => {
        const { container } = render(
          <TestProviders>
            <InteractiveDemo
              Playground={buttonPlayground}
              controls={buttonConfig.controls}
            />
          </TestProviders>,
        );

        await expectNoAriaViolations(container);
      },
      a11yTimeout,
    );
  });
});

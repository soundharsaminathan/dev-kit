import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import { ToastProvider } from "../Toast";
import { useToastContext } from "../toast-context";

function ToastTrigger({ title }: { title: string }) {
  const { toast } = useToastContext("ToastTrigger");
  return <Button onClick={() => toast({ title })}>Show toast</Button>;
}

describe("Toast reduced motion", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: String(query).includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders with reduced-motion animation branches", () => {
    function Multi() {
      const { toast } = useToastContext("Multi");
      return (
        <Button
          onClick={() => {
            toast({ title: "One" });
            toast({ title: "Two" });
          }}
        >
          Show toasts
        </Button>
      );
    }

    render(
      <ToastProvider position="bottom-right">
        <Multi />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toasts" }));
    expect(screen.getAllByRole("alertdialog")).toHaveLength(2);
    expect(document.querySelector("[data-toast-region]")).toHaveAttribute(
      "data-position",
      "bottom-right",
    );
  });
});

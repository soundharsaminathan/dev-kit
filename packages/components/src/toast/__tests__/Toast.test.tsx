import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import { createToastQueue, ToastProvider } from "../Toast";
import { useToastContext } from "../toast-context";

function ToastTrigger({
  title,
  description,
  variant,
  action,
}: {
  title: string;
  description?: string;
  variant?: "success" | "error" | "warning" | "info" | "loading" | "neutral";
  action?: { label: string; onPress: () => void };
}) {
  const { toast } = useToastContext("ToastTrigger");

  return (
    <Button
      onClick={() =>
        toast({
          title,
          ...(description !== undefined ? { description } : {}),
          ...(variant !== undefined ? { variant } : {}),
          ...(action !== undefined ? { action } : {}),
        })
      }
    >
      Show toast
    </Button>
  );
}

describe("Toast", () => {
  it("renders a toast from the context helper", () => {
    render(
      <ToastProvider position="bottom-right">
        <ToastTrigger title="Saved" description="Your changes were saved." />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Your changes were saved.")).toBeInTheDocument();
    expect(document.querySelector("[data-toast-region]")).toHaveAttribute(
      "data-position",
      "bottom-right",
    );
  });

  it("applies toast variants", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Done" variant="success" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    expect(document.querySelector("[data-toast]")).toHaveAttribute(
      "data-variant",
      "success",
    );
  });

  it("does not render the region before any toast is queued", () => {
    render(
      <ToastProvider>
        <Button>Show toast</Button>
      </ToastProvider>,
    );

    expect(
      document.querySelector("[data-toast-region]"),
    ).not.toBeInTheDocument();
  });

  it("exposes a close control", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Unable to save" variant="error" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    expect(screen.getByRole("alertdialog")).toHaveAttribute(
      "data-variant",
      "error",
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders loading toasts with a spinner", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Saving" variant="loading" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    expect(document.querySelector("[data-toast]")).toHaveAttribute(
      "data-variant",
      "loading",
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders toast actions", () => {
    const onAction = vi.fn();

    render(
      <ToastProvider>
        <ToastTrigger
          title="Deleted"
          action={{ label: "Undo", onPress: onAction }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector("[data-slot='toast-actions']"),
    ).toBeInTheDocument();
  });

  it("dismisses a toast when the close button is clicked", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Saved" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("supports an external toast queue", () => {
    const queue = createToastQueue();

    render(
      <ToastProvider queue={queue} position="top-center">
        <Button>Show toast</Button>
      </ToastProvider>,
    );

    act(() => {
      queue.add({ title: "Queued toast" });
    });

    expect(screen.getByText("Queued toast")).toBeInTheDocument();
    expect(document.querySelector("[data-toast-region]")).toHaveAttribute(
      "data-position",
      "top-center",
    );
  });

  it("respects maxVisibleToasts", () => {
    function MultiToastTrigger() {
      const { toast } = useToastContext("MultiToastTrigger");
      return (
        <Button
          onClick={() => {
            toast({ title: "First" });
            toast({ title: "Second" });
          }}
        >
          Show toasts
        </Button>
      );
    }

    render(
      <ToastProvider maxVisibleToasts={1}>
        <MultiToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toasts" }));

    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
  });

  it("stacks multiple visible toasts", () => {
    function MultiToastTrigger() {
      const { toast } = useToastContext("MultiToastTrigger");
      return (
        <Button
          onClick={() => {
            toast({ title: "First" });
            toast({ title: "Second" });
          }}
        >
          Show toasts
        </Button>
      );
    }

    render(
      <ToastProvider>
        <MultiToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toasts" }));

    const region = document.querySelector("[data-toast-region]");
    expect(region).toHaveAttribute("data-stacked");
    expect(region).toHaveAttribute("data-count", "2");
    expect(screen.getAllByRole("alertdialog")).toHaveLength(2);
  });

  it("auto-dismisses toasts after the default timeout", () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastTrigger title="Saved" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders status icons for semantic variants", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Done" variant="success" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    expect(
      document.querySelector("[data-slot='toast-icon']"),
    ).toBeInTheDocument();
  });

  it("defaults to a maximum of three visible toasts", () => {
    function MultiToastTrigger() {
      const { toast } = useToastContext("MultiToastTrigger");
      return (
        <Button
          onClick={() => {
            toast({ title: "First" });
            toast({ title: "Second" });
            toast({ title: "Third" });
            toast({ title: "Fourth" });
          }}
        >
          Show toasts
        </Button>
      );
    }

    render(
      <ToastProvider>
        <MultiToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toasts" }));

    expect(screen.getAllByRole("alertdialog")).toHaveLength(3);
    expect(document.querySelector("[data-toast-region]")).toHaveAttribute(
      "data-count",
      "3",
    );
  });

  it("defaults the region to top-right", () => {
    render(
      <ToastProvider>
        <ToastTrigger title="Saved" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    const region = document.querySelector("[data-toast-region]");
    expect(region).toHaveAttribute("data-position", "top-right");
  });
});

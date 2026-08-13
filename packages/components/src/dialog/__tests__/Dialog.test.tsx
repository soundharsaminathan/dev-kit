import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import { Modal } from "../../modal/Modal";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogInset,
  DialogTitle,
} from "../Dialog";

function renderDialog({
  defaultOpen = false,
  showCloseButton = false,
}: {
  defaultOpen?: boolean;
  showCloseButton?: boolean;
} = {}) {
  render(
    <Dialog defaultOpen={defaultOpen}>
      <Button aria-label="Open dialog">Open</Button>
      <Modal>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogBody>Are you sure?</DialogBody>
          <DialogInset>Inset content</DialogInset>
          <DialogFooter>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Modal>
    </Dialog>,
  );
}

describe("Dialog", () => {
  it("renders dialog trigger", () => {
    renderDialog();

    expect(
      screen.getByRole("button", { name: "Open dialog" }),
    ).toBeInTheDocument();
  });

  it("opens dialog with accessible title", () => {
    renderDialog({ defaultOpen: true });

    expect(
      screen.getByRole("dialog", { name: "Confirm action" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Confirm action" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("closes dialog when close button is pressed", () => {
    renderDialog({ defaultOpen: true, showCloseButton: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(
      document.querySelector("[data-icon-only='true']") as HTMLButtonElement,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("wires description id to dialog content", () => {
    renderDialog({ defaultOpen: true });

    const dialog = screen.getByRole("dialog");
    const description = screen.getByText("This cannot be undone.");

    expect(dialog.getAttribute("aria-describedby")).toContain(
      description.getAttribute("id"),
    );
  });

  it("renders body, inset, and footer regions", () => {
    renderDialog({ defaultOpen: true });

    expect(document.querySelector("[data-dialog-body]")).toHaveTextContent(
      "Are you sure?",
    );
    expect(document.querySelector("[data-dialog-inset]")).toHaveTextContent(
      "Inset content",
    );
    expect(document.querySelector("[data-dialog-footer]")).toBeTruthy();
  });

  it("renders without a trigger child", () => {
    render(
      <Dialog defaultOpen>
        <Modal>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No trigger</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Modal>
      </Dialog>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("throws when DialogContent is used outside Dialog", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>,
      ),
    ).toThrow("DialogContent must be used within Dialog");

    consoleError.mockRestore();
  });

  it("throws when DialogTitle is used outside Dialog", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<DialogTitle>Title</DialogTitle>)).toThrow(
      "DialogTitle must be used within Dialog",
    );

    consoleError.mockRestore();
  });

  it("throws when DialogDescription is used outside Dialog", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<DialogDescription>Description</DialogDescription>),
    ).toThrow("DialogDescription must be used within Dialog");

    consoleError.mockRestore();
  });
});

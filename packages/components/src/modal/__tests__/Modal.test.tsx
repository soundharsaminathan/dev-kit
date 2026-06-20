import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../../button/Button";
import { Dialog, DialogContent, DialogTitle } from "../../dialog/Dialog";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders modal structure when open", () => {
    render(
      <Dialog defaultOpen>
        <Button aria-label="Open">Open</Button>
        <Modal>
          <DialogContent>
            <DialogTitle>Modal title</DialogTitle>
          </DialogContent>
        </Modal>
      </Dialog>,
    );

    expect(
      document.querySelector('[data-modal-backdrop=""]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-modal-viewport=""]'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-modal=""]')).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <Dialog>
        <Button aria-label="Open">Open</Button>
        <Modal>
          <DialogContent>
            <DialogTitle>Modal title</DialogTitle>
          </DialogContent>
        </Modal>
      </Dialog>,
    );

    expect(container.querySelector('[data-modal=""]')).not.toBeInTheDocument();
  });
});

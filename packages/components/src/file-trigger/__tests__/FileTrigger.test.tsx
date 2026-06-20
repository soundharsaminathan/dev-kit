import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "../../button/Button";
import { FileTrigger } from "../FileTrigger";

describe("FileTrigger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders trigger element", () => {
    render(
      <FileTrigger>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("passes accept and allowsMultiple to the file input", () => {
    const { container } = render(
      <FileTrigger accept="image/*" allowsMultiple>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("accept", "image/*");
    expect(input).toHaveAttribute("multiple");
  });

  it("opens the file dialog when the trigger is clicked", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(
      <FileTrigger>
        <button type="button">Upload</button>
      </FileTrigger>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("opens the file dialog once when using Button as trigger", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(
      <FileTrigger>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("calls onSelect when the same file is chosen again", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FileTrigger onSelect={onSelect}>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(input.value).toBe("");
  });

  it("calls onSelect when files are chosen", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FileTrigger onSelect={onSelect}>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]?.[0]?.name).toBe("hello.txt");
  });

  it("sets data-selected on the trigger after files are chosen", () => {
    const { container } = render(
      <FileTrigger>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    expect(screen.getByRole("button", { name: "Upload" })).not.toHaveAttribute(
      "data-selected",
    );

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("button", { name: "Upload" })).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("does not render a clear button by default", () => {
    render(
      <FileTrigger>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
    ).not.toBeInTheDocument();
  });

  it("clears the selection when allowsClearing is enabled", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FileTrigger allowsClearing onSelect={onSelect}>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    const trigger = screen.getByRole("button", { name: "Upload" });
    expect(trigger).toHaveAttribute("data-selected", "true");
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(trigger).not.toHaveAttribute("data-selected");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(
      screen.queryByRole("button", { name: "Clear selection" }),
    ).not.toBeInTheDocument();
  });

  it("does not open the file dialog when disabled", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(
      <FileTrigger isDisabled>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(clickSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("does not clear selection when disabled", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FileTrigger allowsClearing isDisabled onSelect={onSelect}>
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    const clearButton = screen.getByRole("button", {
      name: "Clear selection",
    });
    expect(clearButton).toBeDisabled();

    fireEvent.click(clearButton);
    expect(onSelect).not.toHaveBeenCalledWith(null);
  });

  it("uses a custom clear label", () => {
    const { container } = render(
      <FileTrigger allowsClearing clearLabel="Remove file">
        <Button>Upload</Button>
      </FileTrigger>,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });
    expect(
      screen.getByRole("button", { name: "Remove file" }),
    ).toBeInTheDocument();
  });

  it("throws when children is not a single element", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const InvalidFileTrigger = FileTrigger as FC<{ children?: ReactNode }>;

    expect(() =>
      render(<InvalidFileTrigger>Upload</InvalidFileTrigger>),
    ).toThrow("FileTrigger expects a single React element child.");

    consoleError.mockRestore();
  });
});

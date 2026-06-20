import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Loader } from "../Loader";

describe("Loader", () => {
  it("renders as progressbar", () => {
    render(<Loader />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets data-loader attribute", () => {
    render(<Loader />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-loader", "");
  });

  it("has default aria-label", () => {
    render(<Loader />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "loading...",
    );
  });

  it("renders the ring variant", () => {
    render(<Loader variant="ring" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });
});

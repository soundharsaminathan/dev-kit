// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DrawerPlayground from "@/registry/drawer/playground";
import { TestProviders } from "@/test-utils/providers";

describe("DrawerPlayground", () => {
  it("opens and closes the drawer", () => {
    render(
      <TestProviders>
        <DrawerPlayground placement="right" title="Test drawer" />
      </TestProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(
      screen.getByRole("heading", { name: "Test drawer" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByRole("heading", { name: "Test drawer" }),
    ).not.toBeInTheDocument();
  });

  it("closes when the dismiss control is activated", () => {
    render(
      <TestProviders>
        <DrawerPlayground placement="right" title="Test drawer" />
      </TestProviders>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(
      screen.getByRole("heading", { name: "Test drawer" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]!);
    expect(
      screen.queryByRole("heading", { name: "Test drawer" }),
    ).not.toBeInTheDocument();
  });
});

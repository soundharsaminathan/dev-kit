// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DrawerPlayground from "@/registry/drawer/playground";
import { TestProviders } from "@/test-utils/providers";

function finishDrawerExit() {
  const panel = document.querySelector("[data-drawer]");
  if (panel) {
    act(() => {
      fireEvent.transitionEnd(panel, {
        propertyName: "transform",
        bubbles: true,
      });
    });
  }
}

describe("DrawerPlayground", () => {
  it("opens and closes the drawer", async () => {
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
    finishDrawerExit();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Test drawer" }),
      ).not.toBeInTheDocument();
    });
  });
});

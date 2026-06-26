// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routeTree } from "../routeTree.gen";

function createTestRouter(initialPath = "/components/button") {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({
    routeTree,
    history,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
  });
}

describe("Component pager", () => {
  it("links to neighboring components", async () => {
    const router = createTestRouter("/components/button");
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.status).toBe("idle");
    });

    const pager = screen.getByRole("navigation", { name: "Component pager" });
    expect(pager).toBeInTheDocument();
    expect(pager.querySelector("a")).toBeTruthy();
  });
});

describe("Header theme controls", () => {
  it("switches theme mode from the header", async () => {
    const router = createTestRouter("/theme-editor");
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.status).toBe("idle");
    });

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
  });
});

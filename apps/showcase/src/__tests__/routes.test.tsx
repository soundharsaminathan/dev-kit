// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { routeTree } from "../routeTree.gen";

function createTestRouter(initialPath = "/") {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({
    routeTree,
    history,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
  });
}

async function renderRoute(initialPath = "/") {
  const router = createTestRouter(initialPath);
  render(<RouterProvider router={router} />);
  await waitFor(
    () => {
      expect(router.state.status).toBe("idle");
    },
    { timeout: 15_000 },
  );
  return router;
}

describe("showcase routes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the home page", async () => {
    await renderRoute("/");

    expect(
      screen.getByRole("heading", { name: "Component Showcase" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse components" }),
    ).toBeInTheDocument();
  });

  it("renders the components index", async () => {
    await renderRoute("/components/");

    expect(
      await screen.findByRole("heading", { name: "Components" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Buttons" }),
    ).toBeInTheDocument();
  });

  it("renders a component detail page", async () => {
    await renderRoute("/components/button");

    expect(screen.getByRole("heading", { name: "Button" })).toBeInTheDocument();
    expect(screen.getByText("Playground")).toBeInTheDocument();
  });

  it("renders the themes comparison page", async () => {
    await renderRoute("/themes");

    expect(
      await screen.findByRole("heading", { name: "Themes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Light mode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("renders the theme editor page", async () => {
    await renderRoute("/theme-editor");

    expect(
      await screen.findByRole("heading", { name: "Theme editor" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "dark",
    );
  });

  it("renders the app header on routed pages", async () => {
    await renderRoute("/theme-editor");

    expect(
      screen.getByRole("link", { name: "Component Showcase" }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText("Theme")[0]).toBeInTheDocument();
    expect(screen.getByLabelText("Theme mode")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import * as tokens from "@dev-ui/tokens";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

type RenderRouteOptions = {
  ready?: () => void;
  timeout?: number;
};

async function renderRoute(
  initialPath = "/",
  { ready, timeout = 15_000 }: RenderRouteOptions = {},
) {
  const router = createTestRouter(initialPath);
  render(<RouterProvider router={router} />);
  await waitFor(
    () => {
      if (ready) {
        ready();
        return;
      }
      expect(router.state.status).toBe("idle");
    },
    { timeout },
  );
  return router;
}

describe("showcase routes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    await renderRoute("/components/button", {
      ready: () => {
        expect(
          screen.getByRole("heading", { name: "Button" }),
        ).toBeInTheDocument();
      },
      timeout: 45_000,
    });

    expect(screen.getByRole("heading", { name: "Button" })).toBeInTheDocument();
    expect(screen.getByText("Playground")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Component pager" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /← Toggle Button/i }),
    ).not.toBeInTheDocument();
  }, 60_000);

  it("renders the last component without a next pager link", async () => {
    await renderRoute("/components/tag-group", {
      ready: () => {
        expect(
          screen.getByRole("heading", { name: "Tag Group" }),
        ).toBeInTheDocument();
      },
    });

    expect(
      screen.getByRole("heading", { name: "Tag Group" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Component pager" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("navigation", { name: "Component pager" }),
      ).queryByRole("link", { name: /→/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a component with normalized control values", async () => {
    await renderRoute("/components/color-slider");

    expect(
      screen.getByRole("heading", { name: "Color Slider" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Playground")).toBeInTheDocument();
  });

  it("renders the themes comparison page", async () => {
    vi.spyOn(tokens, "getBuiltInThemeIds").mockReturnValue(["default"]);

    await renderRoute("/themes", {
      ready: () => {
        expect(
          screen.getByRole("heading", { name: "Themes" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: "Light mode" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: "Dark mode" }),
        ).toBeInTheDocument();
      },
    });
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
    expect(
      screen.getByRole("button", { name: "Edit theme" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Theme mode")).toBeInTheDocument();
  });

  it("renders not found for unknown component slugs", async () => {
    await renderRoute("/components/not-a-real-component");

    expect(
      await screen.findByRole("heading", { name: "Component not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to components" }),
    ).toBeInTheDocument();
  });

  it("switches back to light mode on the theme editor page", async () => {
    await renderRoute("/theme-editor");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "dark",
    );

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe(
      "light",
    );
  });
});

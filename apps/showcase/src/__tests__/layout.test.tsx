// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { routeTree } from "../routeTree.gen";

vi.mock("@/modules/layout/showcase-sidebar", () => ({
  ShowcaseSidebar: () => (
    <nav aria-label="Components">
      <a href="/components/button">Button</a>
    </nav>
  ),
  ComponentsLayout: ({ children }: { children: React.ReactNode }) => (
    <div>
      <nav aria-label="Components">
        <a href="/components/button">Button</a>
      </nav>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/registry")>();
  function StubPlayground() {
    return <div data-testid="playground-stub">Playground stub</div>;
  }
  function withStub(
    entry: NonNullable<ReturnType<typeof actual.getRegistryEntry>>,
  ) {
    return { ...entry, Playground: StubPlayground };
  }
  return {
    ...actual,
    getRegistryEntry: (slug: Parameters<typeof actual.getRegistryEntry>[0]) => {
      const entry = actual.getRegistryEntry(slug);
      return entry ? withStub(entry) : null;
    },
    getAllRegistryEntries: () => actual.getAllRegistryEntries().map(withStub),
  };
});

function createTestRouter(initialPath = "/components/button") {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  return createRouter({
    routeTree,
    history,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
    defaultPreload: false,
  });
}

async function renderRoute(initialPath: string) {
  const router = createTestRouter(initialPath);
  render(<RouterProvider router={router} />);
  await waitFor(
    () => {
      expect(router.state.status).toBe("idle");
    },
    { timeout: 5_000 },
  );
  return router;
}

describe("Component pager", () => {
  it("links to neighboring components", async () => {
    await renderRoute("/components/button");

    const pager = await screen.findByRole("navigation", {
      name: "Component pager",
    });
    expect(pager).toBeInTheDocument();
    expect(pager.querySelector("a")).toBeTruthy();
  });
});

describe("Header theme controls", () => {
  it("switches theme mode from the header", async () => {
    await renderRoute("/theme-editor");

    fireEvent.click(await screen.findByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme-mode", "dark");
  });
});

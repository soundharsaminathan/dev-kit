// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeProvider, useTheme } from "@/lib/theme";
import { ShowcaseThemeEditor } from "@/modules/theme-editor/showcase-theme-editor";
import { LIVE_THEME_ID } from "./theme-editor-drawer.mock";

const customThemeInput = {
  label: "Saved theme",
  extends: "default" as const,
  color: {
    algorithm: "oklch" as const,
    seeds: {
      neutral: "#808080",
      accent: "#0000ff",
      success: "#00aa00",
      warning: "#ffaa00",
      danger: "#aa0000",
      info: "#0088ff",
    },
  },
};

function SeededEditor() {
  const { saveCustomTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = saveCustomTheme(customThemeInput);
    setTheme(saved.id);
    setReady(true);
  }, [saveCustomTheme, setTheme]);

  if (!ready) {
    return null;
  }

  return <ShowcaseThemeEditor defaultOpen />;
}

describe("ShowcaseThemeEditor", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens the drawer and applies live theme edits", () => {
    render(
      <AppThemeProvider>
        <ShowcaseThemeEditor defaultOpen />
      </AppThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Close theme editor" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "Live preview theme" },
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      LIVE_THEME_ID,
    );
  });

  it("saves, loads, and deletes custom themes", async () => {
    render(
      <AppThemeProvider>
        <SeededEditor />
      </AppThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Saved themes" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Theme name")).toHaveValue("Saved theme");

    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    await waitFor(() => {
      expect(
        within(screen.getByRole("list")).getByRole("button", {
          name: "Saved theme",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      within(screen.getByRole("list")).getByRole("button", {
        name: "Saved theme",
      }),
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Saved themes" }),
      ).not.toBeInTheDocument();
    });
  });

  it("clears live preview when the drawer closes", async () => {
    render(
      <AppThemeProvider>
        <ShowcaseThemeEditor defaultOpen />
      </AppThemeProvider>,
    );

    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "Live preview theme" },
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      LIVE_THEME_ID,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close theme editor" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Close theme editor" }),
      ).not.toBeInTheDocument();
      expect(document.documentElement.getAttribute("data-theme")).toBe(
        "default",
      );
    });
  });

  it("opens from the trigger and syncs the active theme draft", async () => {
    render(
      <AppThemeProvider>
        <ShowcaseThemeEditor />
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit theme" }));

    expect(
      await screen.findByRole("button", { name: "Close theme editor" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Theme name")).toHaveValue("My theme");
  });

  it("changes theme and icon pack from header selects", async () => {
    render(
      <AppThemeProvider>
        <ShowcaseThemeEditor defaultOpen />
      </AppThemeProvider>,
    );

    const drawer = await screen.findByTestId("theme-editor-drawer");

    fireEvent.click(within(drawer).getByRole("button", { name: /Theme/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Material" }));
    await waitFor(() => {
      expect(
        within(drawer).getByRole("button", { name: /Theme/ }),
      ).toHaveTextContent("Material");
    });

    fireEvent.click(within(drawer).getByRole("button", { name: /Icon pack/ }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Heroicons Outline" }),
    );
    await waitFor(() => {
      expect(
        within(drawer).getByRole("button", { name: /Icon pack/ }),
      ).toHaveTextContent("Heroicons Outline");
    });
  });

  it("supports controlled open state and custom triggers", () => {
    render(
      <AppThemeProvider>
        <ShowcaseThemeEditor isOpen onOpenChange={vi.fn()} trigger={null} />
      </AppThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Close theme editor" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit theme" }),
    ).not.toBeInTheDocument();
  });
});

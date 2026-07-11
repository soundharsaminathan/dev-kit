// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  __resetIconCachesForTests,
  __setActivePackForTests,
  packLibraries,
} from "@dev-ui/icons";
import lucidePack from "@dev-ui/icons-packs/lucide";
import {
  act,
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

function seedIconPackCache() {
  for (const pack of packLibraries) {
    __setActivePackForTests(pack.id, lucidePack);
  }
  __setActivePackForTests("lucide", lucidePack);
}

async function selectDrawerOption(
  drawer: HTMLElement,
  triggerName: RegExp,
  optionName: string,
) {
  fireEvent.click(within(drawer).getByRole("button", { name: triggerName }));
  const listbox = await screen.findByRole("listbox");
  fireEvent.click(within(listbox).getByRole("option", { name: optionName }));
  await waitFor(() => {
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  await waitFor(() => {
    expect(
      within(drawer).getByRole("button", { name: triggerName }),
    ).toHaveTextContent(optionName);
  });
}

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
    __resetIconCachesForTests();
    seedIconPackCache();
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

    await act(async () => {});

    expect(
      screen.getByRole("heading", { name: "Saved themes" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Theme name")).toHaveValue("Saved theme");

    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    expect(
      within(screen.getByRole("list")).getByRole("button", {
        name: "Saved theme",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("list")).getByRole("button", {
        name: "Saved theme",
      }),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);

    expect(
      screen.queryByRole("heading", { name: "Saved themes" }),
    ).not.toBeInTheDocument();
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

    await selectDrawerOption(drawer, /Theme/, "Material");
    await selectDrawerOption(drawer, /Icon pack/, "Heroicons Outline");
  }, 60_000);

  it("marks inactive saved themes with the default button variant", async () => {
    render(
      <AppThemeProvider>
        <SeededEditor />
      </AppThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Saved themes" }),
    ).toBeInTheDocument();

    const drawer = await screen.findByTestId("theme-editor-drawer");
    await selectDrawerOption(drawer, /Theme/, "Material");

    const savedThemeButton = within(screen.getByRole("list")).getByRole(
      "button",
      { name: "Saved theme" },
    );
    expect(savedThemeButton).not.toHaveAttribute("data-variant", "primary");

    fireEvent.click(savedThemeButton);
    await waitFor(() => {
      expect(savedThemeButton).toHaveAttribute("data-variant", "primary");
    });
  }, 60_000);

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

import "@testing-library/jest-dom/vitest";
import lucidePack from "@dev-ui/icons-packs/lucide";
import materialSymbolsOutlinedPack from "@dev-ui/icons-packs/material-symbols-outlined";
import materialSymbolsRoundedPack from "@dev-ui/icons-packs/material-symbols-rounded";
import materialSymbolsSharpPack from "@dev-ui/icons-packs/material-symbols-sharp";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  __setActivePackForTests,
  cachePackModule,
  getActivePackId,
} from "../core/icon-cache";
import { getCustomPackIds } from "../core/register-icon-pack";
import type { IconPackModule } from "../core/types";
import {
  __clearCustomPacksForTests,
  __resetIconCachesForTests,
  Icon,
  IconButton,
  IconProvider,
  registerIconPack,
  useIcons,
} from "../index";

describe("IconProvider", () => {
  it("renders icons from initialPack synchronously", () => {
    render(
      <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
        <Icon name="search" data-testid="search-icon" />
      </IconProvider>,
    );

    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("registers and loads custom icon packs", async () => {
    __resetIconCachesForTests();
    __clearCustomPacksForTests();

    const CustomSearch = () => <svg data-testid="custom-search" />;

    registerIconPack("acme", {
      load: async () => ({
        default: {
          id: "acme",
          icons: {
            search: CustomSearch,
          },
        },
      }),
    });

    render(
      <IconProvider icons={{ library: "acme" }}>
        <Icon name="search" />
      </IconProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-search")).toBeInTheDocument();
    });
  });

  it("keeps rendering previous pack while switching", async () => {
    __resetIconCachesForTests();
    __clearCustomPacksForTests();

    let resolvePack: (value: { default: typeof lucidePack }) => void = () => {};
    const pendingPack = new Promise<{
      default: typeof lucidePack;
    }>((resolve) => {
      resolvePack = resolve;
    });

    registerIconPack("slow", {
      load: () => pendingPack,
    });

    const { rerender } = render(
      <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
        <Icon name="search" data-testid="icon" />
      </IconProvider>,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();

    rerender(
      <IconProvider icons={{ library: "slow" }} initialPack={lucidePack}>
        <Icon name="search" data-testid="icon" />
      </IconProvider>,
    );

    expect(screen.getByTestId("icon")).toBeInTheDocument();

    resolvePack({ default: lucidePack });

    await waitFor(() => {
      expect(screen.getByTestId("icon")).toBeInTheDocument();
    });
  });

  it("shows fallback when icon is missing", () => {
    render(
      <IconProvider
        icons={{ library: "lucide" }}
        initialPack={{ id: "lucide", icons: {} }}
      >
        <Icon name="search" fallback={<span data-testid="fallback" />} />
      </IconProvider>,
    );

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it.each([
    {
      variant: "outlined" as const,
      pack: materialSymbolsOutlinedPack,
      className: "material-symbols-outlined",
      fontName: "Material Symbols Outlined",
    },
    {
      variant: "rounded" as const,
      pack: materialSymbolsRoundedPack,
      className: "material-symbols-rounded",
      fontName: "Material Symbols Rounded",
    },
    {
      variant: "sharp" as const,
      pack: materialSymbolsSharpPack,
      className: "material-symbols-sharp",
      fontName: "Material Symbols Sharp",
    },
  ])("applies material symbols $variant font styles to ligature icons", ({
    variant,
    pack,
    className,
    fontName,
  }) => {
    const { container } = render(
      <IconProvider
        icons={{ library: "material-symbols", variant }}
        initialPack={pack as IconPackModule}
      >
        <Icon name="search" />
      </IconProvider>,
    );

    const icon = container.querySelector(`.${className}`);
    expect(icon).not.toBeNull();
    expect(icon).toHaveTextContent("search");
    expect(getComputedStyle(icon as Element).fontFamily).toContain(fontName);
  });
});

describe("registerIconPack", () => {
  it("throws when pack loader is missing", async () => {
    __resetIconCachesForTests();
    __clearCustomPacksForTests();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <IconProvider icons={{ library: "missing-pack" }}>
        <Icon name="search" fallback={<span data-testid="fallback" />} />
      </IconProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("fallback")).toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });

  it("tracks registered custom pack ids", () => {
    __clearCustomPacksForTests();

    registerIconPack("acme", {
      load: async () => ({
        default: { id: "acme", icons: {} },
      }),
    });

    expect(getCustomPackIds()).toEqual(["acme"]);
  });
});

describe("IconButton", () => {
  it("renders a labeled icon button", () => {
    render(
      <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
        <IconButton name="search" label="Search" />
      </IconProvider>,
    );

    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});

describe("useIcons", () => {
  it("throws outside of an IconProvider", () => {
    const BrokenConsumer = () => {
      useIcons();
      return null;
    };

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useIcons must be used within an IconProvider",
    );

    errorSpy.mockRestore();
  });
});

describe("icon cache", () => {
  it("tracks the active pack id and reuses in-flight loads", async () => {
    __resetIconCachesForTests();

    let resolvePack: (value: IconPackModule) => void = () => {};
    const pendingPack = new Promise<IconPackModule>((resolve) => {
      resolvePack = resolve;
    });

    const tracked = cachePackModule("tracked", pendingPack);
    expect(cachePackModule("tracked", pendingPack)).toBe(tracked);

    __setActivePackForTests("tracked", { id: "tracked", icons: {} });
    expect(getActivePackId()).toBe("tracked");

    resolvePack({ id: "tracked", icons: {} });
    await expect(tracked).resolves.toEqual({ id: "tracked", icons: {} });
  });
});

describe("IconProvider", () => {
  it("loads built-in packs without an initial pack", async () => {
    __resetIconCachesForTests();
    __clearCustomPacksForTests();

    render(
      <IconProvider
        icons={{ library: "lucide" }}
        loaders={{ lucide: () => import("@dev-ui/icons-packs/lucide") }}
      >
        <Icon name="search" data-testid="search-icon" />
      </IconProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    });
  });
});

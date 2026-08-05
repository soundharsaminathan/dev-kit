import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioBrandProvider } from "./studio-brand-provider";

const setLiveTheme = vi.fn();
const get = vi.fn();

vi.mock("@dev-ui/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dev-ui/core")>();
  return {
    ...actual,
    useTheme: () => ({
      setLiveTheme,
      mode: "light" as const,
      setMode: vi.fn(),
      theme: "step-up",
      themes: [],
      customThemes: [],
      liveTheme: null,
      setTheme: vi.fn(),
      toggleMode: vi.fn(),
      saveCustomTheme: vi.fn(),
      deleteCustomTheme: vi.fn(),
    }),
  };
});

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({ get }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", studioId: "studio-1" } }),
}));

vi.mock("@/lib/use-studio-id", () => ({
  useOptionalStudioId: () => "studio-1",
}));

let isEditing = false;

vi.mock("@/modules/branding/studio-brand-edit-context", () => ({
  useStudioBrandEdit: () => ({
    isEditing,
    setEditing: vi.fn(),
  }),
}));

const brandTheme = {
  label: "Coral Studio",
  extends: "step-up-soft",
  color: {
    algorithm: "oklch" as const,
    seeds: { neutral: "#78716c", accent: "#f97316" },
  },
  tokenOverrides: {},
};

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("StudioBrandProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEditing = false;
    get.mockResolvedValue({ id: "studio-1", brandTheme });
  });

  it("applies the saved brand theme after the studio loads", async () => {
    render(
      <Wrapper>
        <StudioBrandProvider>
          <div />
        </StudioBrandProvider>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(setLiveTheme).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "studio-studio-1",
          label: "Coral Studio",
        }),
      );
    });
  });

  it("does not clear the live theme before the studio query succeeds", () => {
    get.mockReturnValue(new Promise(() => undefined));

    render(
      <Wrapper>
        <StudioBrandProvider>
          <div />
        </StudioBrandProvider>
      </Wrapper>,
    );

    expect(setLiveTheme).not.toHaveBeenCalled();
  });

  it("skips applying while a brand editor owns the live theme", async () => {
    isEditing = true;

    render(
      <Wrapper>
        <StudioBrandProvider>
          <div />
        </StudioBrandProvider>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(get).toHaveBeenCalled();
    });

    expect(setLiveTheme).not.toHaveBeenCalled();
  });

  it("clears the live theme when the studio has no brandTheme", async () => {
    get.mockResolvedValue({ id: "studio-1", brandTheme: null });

    render(
      <Wrapper>
        <StudioBrandProvider>
          <div />
        </StudioBrandProvider>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(setLiveTheme).toHaveBeenCalledWith(null);
    });
  });
});

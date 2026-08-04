import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandingPanel } from "./branding-panel";

const setLiveTheme = vi.fn();
const setMode = vi.fn();
const setEditing = vi.fn();
const patch = vi.fn();

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@dev-ui/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dev-ui/core")>();
  return {
    ...actual,
    useTheme: () => ({
      setLiveTheme,
      mode: "light" as const,
      setMode,
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

vi.mock("@dev-ui/components/theme-editor", () => ({
  ThemeColorPanel: ({
    value,
    onChange,
  }: {
    value: { label: string };
    onChange: (next: { label: string }) => void;
  }) => (
    <input
      aria-label="Theme name"
      value={value.label}
      onChange={(event) => onChange({ ...value, label: event.target.value })}
    />
  ),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    patch,
  }),
}));

vi.mock("@/lib/use-studio-id", () => ({
  useStudioId: () => "studio-seed-1",
  useOptionalStudioId: () => "studio-seed-1",
}));

vi.mock("@/modules/branding/studio-brand-edit-context", () => ({
  useStudioBrandEdit: () => ({
    isEditing: true,
    setEditing,
  }),
}));

vi.mock("@/modules/social/upload", () => ({
  uploadSocialPhoto: vi.fn(),
}));

vi.mock("@/modules/ui/touch-button", () => ({
  TouchButton: ({
    children,
    onClick,
    isPending,
    isDisabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    isPending?: boolean;
    isDisabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={isPending || isDisabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/modules/ui/states", () => ({
  ErrorState: ({ description }: { description: string }) => (
    <p>{description}</p>
  ),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BrandingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patch.mockResolvedValue({});
  });

  it("marks branding as editing and previews the live theme", () => {
    render(
      <Wrapper>
        <BrandingPanel studioName="Acme Dance" brandTheme={null} />
      </Wrapper>,
    );

    expect(setEditing).toHaveBeenCalledWith(true);
    expect(setLiveTheme).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Upload logo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save theme" })).toBeTruthy();
  });

  it("does not claim brand editing when theme UI is hidden", () => {
    render(
      <Wrapper>
        <BrandingPanel
          studioName="Acme Dance"
          brandTheme={null}
          showTheme={false}
        />
      </Wrapper>,
    );

    expect(setEditing).not.toHaveBeenCalled();
    expect(setLiveTheme).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Save theme" })).toBeNull();
  });

  it("saves the current draft as brandTheme", async () => {
    render(
      <Wrapper>
        <BrandingPanel studioName="Acme Dance" brandTheme={null} />
      </Wrapper>,
    );

    fireEvent.change(screen.getByLabelText("Theme name"), {
      target: { value: "Acme Night" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    await vi.waitFor(() => {
      expect(patch).toHaveBeenCalledWith(
        expect.stringContaining("/studios/"),
        expect.objectContaining({
          brandTheme: expect.objectContaining({ label: "Acme Night" }),
        }),
      );
    });
  });

  it("resets brandTheme to null", async () => {
    render(
      <Wrapper>
        <BrandingPanel
          studioName="Acme Dance"
          brandTheme={{
            label: "Custom",
            extends: "step-up",
            color: {
              algorithm: "oklch",
              seeds: { neutral: "#8e8e93", accent: "#0a84ff" },
            },
            tokenOverrides: {},
          }}
        />
      </Wrapper>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset to Step Up defaults" }),
    );

    await vi.waitFor(() => {
      expect(patch).toHaveBeenCalledWith(expect.stringContaining("/studios/"), {
        brandTheme: null,
      });
    });
  });
});

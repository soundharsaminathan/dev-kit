import "@testing-library/jest-dom/vitest";
import { ThemeProvider } from "@dev-ui/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandingPanel } from "./branding-panel";

const patch = vi.fn();

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({ patch }),
}));

vi.mock("@/lib/use-studio-id", () => ({
  useStudioId: () => "studio-seed-1",
  useOptionalStudioId: () => "studio-seed-1",
}));

vi.mock("@/modules/branding/studio-brand-edit-context", () => ({
  useStudioBrandEdit: () => ({ isEditing: true, setEditing: vi.fn() }),
}));

vi.mock("@/modules/social/upload", () => ({
  uploadSocialPhoto: vi.fn(),
}));

vi.mock("@/modules/ui/touch-button", () => ({
  TouchButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/modules/ui/states", () => ({
  ErrorState: ({ description }: { description: string }) => (
    <p>{description}</p>
  ),
}));

const NEW_BRAND = "#0ea5e9";

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme="step-up" defaultMode="light">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function themeCss(): string {
  return document.getElementById("dev-ui-theme-overrides")?.textContent ?? "";
}

function renderPanel() {
  return render(
    <Wrapper>
      <BrandingPanel studioName="Acme Dance" brandTheme={null} />
    </Wrapper>,
  );
}

describe("BrandingPanel colour changes reach the theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patch.mockResolvedValue({});
    localStorage.clear();
    document.getElementById("dev-ui-theme-overrides")?.remove();
  });

  it("applies the studio draft as the live theme on mount", () => {
    renderPanel();

    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "studio-studio-seed-1",
    );
    expect(themeCss()).toContain("--color-accent");
  });

  it("regenerates the accent ramp when a brand preset is picked", () => {
    renderPanel();
    const before = themeCss();

    fireEvent.click(screen.getByRole("button", { name: `Use ${NEW_BRAND}` }));

    const after = themeCss();
    expect(after).not.toBe(before);
    expect(after).toContain("--color-accent");
    expect(screen.getByText(NEW_BRAND.toUpperCase())).toBeInTheDocument();
  });

  it("keeps the live theme in sync when a different slot is edited", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: /Danger/ }));
    const before = themeCss();

    fireEvent.click(screen.getByRole("button", { name: "Use #b91c1c" }));

    expect(themeCss()).not.toBe(before);
  });

  it("persists the picked colour through save", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: `Use ${NEW_BRAND}` }));
    fireEvent.click(screen.getByRole("button", { name: "Save theme" }));

    await vi.waitFor(() => {
      expect(patch).toHaveBeenCalledWith(
        "/studios/studio-seed-1",
        expect.objectContaining({
          brandTheme: expect.objectContaining({
            color: expect.objectContaining({
              seeds: expect.objectContaining({ accent: NEW_BRAND }),
            }),
          }),
        }),
      );
    });
  });
});
